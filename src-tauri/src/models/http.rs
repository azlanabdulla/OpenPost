use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteRequestPayload {
    pub request_id: String,
    pub method: String,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
    pub body_type: Option<String>,
    pub timeout_ms: Option<u64>,
    pub verify_ssl: Option<bool>,
    pub follow_redirects: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpResponseCookie {
    pub name: String,
    pub value: String,
    pub domain: Option<String>,
    pub path: Option<String>,
    pub expires: Option<String>,
    pub http_only: Option<bool>,
    pub secure: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpResponsePayload {
    pub request_id: String,
    pub status_code: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub cookies: Vec<HttpResponseCookie>,
    pub body: String,
    pub body_size_bytes: usize,
    pub duration_ms: u64,
    pub is_truncated: bool,
    pub content_type: Option<String>,
    pub is_binary: Option<bool>,
}

/// Helper function to check if a header name is sensitive and should never be logged
pub fn is_sensitive_header(header_name: &str) -> bool {
    let lower = header_name.to_lowercase();
    lower == "authorization"
        || lower == "cookie"
        || lower == "set-cookie"
        || lower == "proxy-authorization"
        || lower.contains("token")
        || lower.contains("secret")
        || lower.contains("api-key")
        || lower.contains("apikey")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_sensitive_header() {
        assert!(is_sensitive_header("Authorization"));
        assert!(is_sensitive_header("authorization"));
        assert!(is_sensitive_header("Cookie"));
        assert!(is_sensitive_header("X-API-KEY"));
        assert!(is_sensitive_header("X-Custom-Token"));
        assert!(!is_sensitive_header("Content-Type"));
        assert!(!is_sensitive_header("Accept"));
        assert!(!is_sensitive_header("User-Agent"));
    }
}
