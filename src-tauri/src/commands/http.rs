use crate::models::http::{ExecuteRequestPayload, HttpResponseCookie, HttpResponsePayload};
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use reqwest::redirect::Policy;
use std::collections::HashMap;
use std::str::FromStr;
use std::time::{Duration, Instant};

#[tauri::command]
pub async fn execute_request(
    payload: ExecuteRequestPayload,
) -> Result<HttpResponsePayload, String> {
    let start_time = Instant::now();

    // 1. Build Client with SSL and redirect settings
    let verify_ssl = payload.verify_ssl.unwrap_or(true);
    let follow_redirects = payload.follow_redirects.unwrap_or(true);
    let timeout_ms = payload.timeout_ms.unwrap_or(30000);

    let redirect_policy = if follow_redirects {
        Policy::default()
    } else {
        Policy::none()
    };

    let client_builder = reqwest::Client::builder()
        .timeout(Duration::from_millis(timeout_ms))
        .danger_accept_invalid_certs(!verify_ssl)
        .redirect(redirect_policy);

    let client = client_builder
        .build()
        .map_err(|e| format!("Failed to initialize HTTP client: {}", e))?;

    // 2. Parse Method
    let method = reqwest::Method::from_str(&payload.method.to_uppercase())
        .map_err(|_| format!("Invalid HTTP method: {}", payload.method))?;

    // 3. Prepare Request
    let mut request_builder = client.request(method.clone(), &payload.url);

    // 4. Attach Headers
    let mut header_map = HeaderMap::new();
    for (key, value) in payload.headers {
        if let (Ok(h_name), Ok(h_val)) = (HeaderName::from_str(&key), HeaderValue::from_str(&value))
        {
            header_map.insert(h_name, h_val);
        }
    }
    request_builder = request_builder.headers(header_map);

    // 5. Attach Body if applicable
    if method != reqwest::Method::GET && method != reqwest::Method::HEAD {
        if let Some(body_text) = payload.body {
            if !body_text.is_empty() {
                request_builder = request_builder.body(body_text);
            }
        }
    }

    // 6. Execute Request
    let response = request_builder.send().await.map_err(|e| {
        let err_str = e.to_string();
        let lower = err_str.to_lowercase();

        let (code, message, is_ssl) = if e.is_timeout() {
            ("OP-NET-003", format!("Request timed out after {}ms", timeout_ms), false)
        } else if e.is_redirect() || lower.contains("redirect") || lower.contains("too many redirects") {
            ("OP-NET-005", "Too many redirects encountered. Potential redirect loop detected.".to_string(), false)
        } else if lower.contains("cert") || lower.contains("ssl") || lower.contains("tls") || lower.contains("handshake") {
            ("OP-SSL-001", "SSL/TLS certificate verification failed. The certificate may be self-signed, expired, or invalid.".to_string(), true)
        } else if lower.contains("dns") || lower.contains("resolve") || lower.contains("failed to lookup") || lower.contains("name resolution") {
            ("OP-NET-001", "Could not resolve host name. Verify that the domain exists and DNS is working.".to_string(), false)
        } else if lower.contains("refused") || lower.contains("10061") || lower.contains("111") {
            ("OP-NET-002", "Connection refused by the target host. Verify the server is running on the specified port.".to_string(), false)
        } else {
            ("OP-NET-999", format!("Network connection failed: {}", err_str), false)
        };

        // Return structured JSON error string
        serde_json::json!({
            "code": code,
            "message": message,
            "technicalDetails": err_str,
            "isSslError": is_ssl
        }).to_string()
    })?;

    let duration_ms = start_time.elapsed().as_millis() as u64;

    // 7. Extract Status and Headers
    let status_code = response.status().as_u16();
    let status_text = response
        .status()
        .canonical_reason()
        .unwrap_or("")
        .to_string();

    let mut response_headers = HashMap::new();
    let mut cookies = Vec::new();

    // Multi-cookie extraction using get_all to prevent HashMap collapsing
    for val in response.headers().get_all(reqwest::header::SET_COOKIE) {
        if let Ok(cookie_str) = val.to_str() {
            cookies.push(parse_cookie_header(cookie_str));
        }
    }

    for (k, v) in response.headers() {
        let key_str = k.as_str().to_string();
        let val_str = v.to_str().unwrap_or("").to_string();
        response_headers.insert(key_str, val_str);
    }

    let content_type = response_headers.get("content-type").cloned();

    // 8. Extract Body
    let body_bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    let body_size_bytes = body_bytes.len();

    // Enforce 50MB max decompressed body safety limit
    const MAX_DECOMPRESSED_BODY_SIZE: usize = 50 * 1024 * 1024;
    if body_size_bytes > MAX_DECOMPRESSED_BODY_SIZE {
        return Err(serde_json::json!({
            "code": "OP-RESP-002",
            "title": "Payload Exceeds Limit",
            "message": format!("Decompressed response body ({} bytes) exceeds the safety threshold of 50MB.", body_size_bytes),
            "technicalDetails": "Response blocked to prevent memory exhaustion and decompression bomb attacks.",
            "isSslError": false
        }).to_string());
    }

    // Detect if content is binary
    let is_binary_mime = content_type
        .as_ref()
        .map(|ct| {
            let ct_lower = ct.to_lowercase();
            ct_lower.starts_with("image/")
                || ct_lower.starts_with("audio/")
                || ct_lower.starts_with("video/")
                || ct_lower.contains("octet-stream")
                || ct_lower.contains("pdf")
                || ct_lower.contains("zip")
                || ct_lower.contains("gzip")
                || ct_lower.contains("tar")
        })
        .unwrap_or(false);

    let is_utf8 = std::str::from_utf8(&body_bytes).is_ok();
    let is_binary = is_binary_mime || !is_utf8;

    let body_str = if is_binary {
        to_base64(&body_bytes)
    } else {
        String::from_utf8_lossy(&body_bytes).to_string()
    };

    Ok(HttpResponsePayload {
        request_id: payload.request_id,
        status_code,
        status_text,
        headers: response_headers,
        cookies,
        body: body_str,
        body_size_bytes,
        duration_ms,
        is_truncated: false,
        content_type,
        is_binary: Some(is_binary),
    })
}

/// Dependency-free standard RFC 4648 base64 encoder
pub fn to_base64(bytes: &[u8]) -> String {
    const CHARSET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        let b0 = chunk[0];
        let b1 = chunk.get(1).copied().unwrap_or(0);
        let b2 = chunk.get(2).copied().unwrap_or(0);
        out.push(CHARSET[(b0 >> 2) as usize] as char);
        out.push(CHARSET[(((b0 & 0x03) << 4) | (b1 >> 4)) as usize] as char);
        if chunk.len() > 1 {
            out.push(CHARSET[(((b1 & 0x0f) << 2) | (b2 >> 6)) as usize] as char);
        } else {
            out.push('=');
        }
        if chunk.len() > 2 {
            out.push(CHARSET[(b2 & 0x3f) as usize] as char);
        } else {
            out.push('=');
        }
    }
    out
}

/// Parses raw Set-Cookie header string into structured HttpResponseCookie
pub fn parse_cookie_header(header_val: &str) -> HttpResponseCookie {
    let mut parts = header_val.split(';');
    let first = parts.next().unwrap_or("").trim();
    let (name, value) = if let Some(eq_idx) = first.find('=') {
        (
            first[..eq_idx].trim().to_string(),
            first[eq_idx + 1..].trim().to_string(),
        )
    } else {
        (first.to_string(), String::new())
    };

    let mut domain = None;
    let mut path = None;
    let mut expires = None;
    let mut http_only = Some(false);
    let mut secure = Some(false);

    for part in parts {
        let p = part.trim();
        let p_lower = p.to_lowercase();
        if p_lower.starts_with("domain=") {
            domain = Some(p[7..].trim().to_string());
        } else if p_lower.starts_with("path=") {
            path = Some(p[5..].trim().to_string());
        } else if p_lower.starts_with("expires=") {
            expires = Some(p[8..].trim().to_string());
        } else if p_lower == "httponly" {
            http_only = Some(true);
        } else if p_lower == "secure" {
            secure = Some(true);
        }
    }

    HttpResponseCookie {
        name,
        value,
        domain,
        path,
        expires,
        http_only,
        secure,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cookie_header_parsing_full() {
        let header = "session_token=xyz123abc; Domain=.example.com; Path=/api; Expires=Wed, 21 Oct 2026 07:28:00 GMT; HttpOnly; Secure";
        let cookie = parse_cookie_header(header);
        assert_eq!(cookie.name, "session_token");
        assert_eq!(cookie.value, "xyz123abc");
        assert_eq!(cookie.domain, Some(".example.com".to_string()));
        assert_eq!(cookie.path, Some("/api".to_string()));
        assert_eq!(cookie.http_only, Some(true));
        assert_eq!(cookie.secure, Some(true));
    }

    #[test]
    fn test_cookie_header_parsing_minimal() {
        let header = "simple_cookie=value_only";
        let cookie = parse_cookie_header(header);
        assert_eq!(cookie.name, "simple_cookie");
        assert_eq!(cookie.value, "value_only");
        assert_eq!(cookie.http_only, Some(false));
        assert_eq!(cookie.secure, Some(false));
    }

    #[test]
    fn test_base64_encoding_rfc_vectors() {
        assert_eq!(to_base64(b""), "");
        assert_eq!(to_base64(b"f"), "Zg==");
        assert_eq!(to_base64(b"fo"), "Zm8=");
        assert_eq!(to_base64(b"foo"), "Zm9v");
        assert_eq!(to_base64(b"foob"), "Zm9vYg==");
        assert_eq!(to_base64(b"fooba"), "Zm9vYmE=");
        assert_eq!(to_base64(b"foobar"), "Zm9vYmFy");
    }
}
