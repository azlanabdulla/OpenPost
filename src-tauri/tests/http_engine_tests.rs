use openpost_lib::commands::http::execute_request;
use openpost_lib::models::http::ExecuteRequestPayload;
use std::collections::HashMap;
use std::net::SocketAddr;
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

/// Spawns a lightweight local HTTP/1.1 mock server for testing engine capabilities
async fn spawn_test_server() -> SocketAddr {
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .expect("Failed to bind test server socket");
    let addr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        loop {
            let (mut socket, _) = match listener.accept().await {
                Ok(conn) => conn,
                Err(_) => break,
            };

            tokio::spawn(async move {
                let mut buf = [0u8; 4096];
                let n = match socket.read(&mut buf).await {
                    Ok(n) if n > 0 => n,
                    _ => return,
                };
                let req_text = String::from_utf8_lossy(&buf[..n]);
                let req_line = req_text.lines().next().unwrap_or("");
                let path = req_line.split_whitespace().nth(1).unwrap_or("/");

                match path {
                    "/timeout" => {
                        // Delay 300ms so a 50ms client timeout fires reliably
                        tokio::time::sleep(Duration::from_millis(300)).await;
                        let resp =
                            "HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\nOK";
                        let _ = socket.write_all(resp.as_bytes()).await;
                    }
                    "/hang" => {
                        // Hang indefinitely to test client-side cancellation / abort
                        tokio::time::sleep(Duration::from_secs(10)).await;
                    }
                    "/redirect-loop" => {
                        // Causes infinite redirects back to self
                        let resp = "HTTP/1.1 302 Found\r\nLocation: /redirect-loop\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
                        let _ = socket.write_all(resp.as_bytes()).await;
                    }
                    "/redirect-target" => {
                        // 302 redirecting to /final
                        let resp = "HTTP/1.1 302 Found\r\nLocation: /final\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
                        let _ = socket.write_all(resp.as_bytes()).await;
                    }
                    "/final" => {
                        let resp = "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 12\r\nConnection: close\r\n\r\nfinal-target";
                        let _ = socket.write_all(resp.as_bytes()).await;
                    }
                    "/binary" => {
                        // Standard 8-byte PNG header magic bytes
                        let body = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
                        let headers = format!(
                            "HTTP/1.1 200 OK\r\nContent-Type: image/png\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                            body.len()
                        );
                        let _ = socket.write_all(headers.as_bytes()).await;
                        let _ = socket.write_all(&body).await;
                    }
                    "/gzip" => {
                        // Pre-computed gzip stream for "Hello, compressed OpenPost!"
                        let gzip_bytes: [u8; 47] = [
                            31, 139, 8, 0, 0, 0, 0, 0, 0, 10, 243, 72, 205, 201, 201, 215, 81, 72,
                            206, 207, 45, 40, 74, 45, 46, 78, 77, 81, 240, 47, 72, 205, 11, 200,
                            47, 46, 81, 4, 0, 199, 194, 167, 251, 27, 0, 0, 0,
                        ];
                        let headers = format!(
                            "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Encoding: gzip\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                            gzip_bytes.len()
                        );
                        let _ = socket.write_all(headers.as_bytes()).await;
                        let _ = socket.write_all(&gzip_bytes).await;
                    }
                    "/multi-cookie" => {
                        let resp = "HTTP/1.1 200 OK\r\nSet-Cookie: session_id=abc123xyz; Path=/; HttpOnly; Secure\r\nSet-Cookie: preferences=dark_mode; Path=/settings; Expires=Wed, 21 Oct 2026 07:28:00 GMT\r\nContent-Length: 2\r\nConnection: close\r\n\r\nOK";
                        let _ = socket.write_all(resp.as_bytes()).await;
                    }
                    _ => {
                        let resp = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
                        let _ = socket.write_all(resp.as_bytes()).await;
                    }
                }
            });
        }
    });

    addr
}

fn create_payload(url: String) -> ExecuteRequestPayload {
    ExecuteRequestPayload {
        request_id: "test-req-1".to_string(),
        method: "GET".to_string(),
        url,
        headers: HashMap::new(),
        body: None,
        body_type: None,
        timeout_ms: Some(5000),
        verify_ssl: Some(false),
        follow_redirects: Some(true),
    }
}

#[tokio::test]
async fn test_http_engine_timeout() {
    let addr = spawn_test_server().await;
    let mut payload = create_payload(format!("http://{}/timeout", addr));
    payload.timeout_ms = Some(50); // Set strict 50ms timeout against 300ms server sleep

    let result = execute_request(payload).await;
    assert!(result.is_err(), "Request must fail due to timeout");

    let err_str = result.unwrap_err();
    let err_json: serde_json::Value =
        serde_json::from_str(&err_str).expect("Error returned by HTTP engine must be valid JSON");

    assert_eq!(err_json["code"], "OP-NET-003");
    assert!(err_json["message"]
        .as_str()
        .unwrap()
        .contains("Request timed out after 50ms"));
    assert_eq!(err_json["isSslError"], false);
}

#[tokio::test]
async fn test_http_engine_cancel() {
    let addr = spawn_test_server().await;
    let payload = create_payload(format!("http://{}/hang", addr));

    // Spawn the request in an async task and cancel it after 30ms via abort handle
    let handle = tokio::spawn(async move { execute_request(payload).await });

    tokio::time::sleep(Duration::from_millis(30)).await;
    handle.abort();

    let join_result = handle.await;
    assert!(
        join_result.is_err(),
        "Task must yield an error when aborted"
    );
    assert!(
        join_result.unwrap_err().is_cancelled(),
        "JoinError must report that task was cancelled"
    );
}

#[tokio::test]
async fn test_http_engine_redirect_limit() {
    let addr = spawn_test_server().await;
    let payload = create_payload(format!("http://{}/redirect-loop", addr));

    let result = execute_request(payload).await;
    assert!(result.is_err(), "Infinite redirect loop must be rejected");

    let err_str = result.unwrap_err();
    let err_json: serde_json::Value =
        serde_json::from_str(&err_str).expect("Error response must be valid JSON");

    // Reqwest terminates on redirect loop limit
    let technical = err_json["technicalDetails"]
        .as_str()
        .unwrap()
        .to_lowercase();
    assert!(
        technical.contains("redirect") || err_json["code"] == "OP-NET-999",
        "Error details must report redirect error"
    );
}

#[tokio::test]
async fn test_http_engine_redirect_disabled() {
    let addr = spawn_test_server().await;
    let mut payload = create_payload(format!("http://{}/redirect-target", addr));
    payload.follow_redirects = Some(false);

    let result = execute_request(payload).await;
    assert!(
        result.is_ok(),
        "Request with follow_redirects=false should succeed and return 302"
    );

    let res = result.unwrap();
    assert_eq!(res.status_code, 302);
    assert_eq!(
        res.headers.get("location").map(|s| s.as_str()),
        Some("/final")
    );
}

#[tokio::test]
async fn test_http_engine_binary_body() {
    let addr = spawn_test_server().await;
    let payload = create_payload(format!("http://{}/binary", addr));

    let result = execute_request(payload).await;
    assert!(result.is_ok(), "Binary request must succeed");

    let res = result.unwrap();
    assert_eq!(res.status_code, 200);
    assert_eq!(res.is_binary, Some(true));
    assert_eq!(res.body_size_bytes, 8);
    // Base64 encoding of [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
    assert_eq!(res.body, "iVBORw0KGgo=");
}

#[tokio::test]
async fn test_http_engine_gzip_decompression() {
    let addr = spawn_test_server().await;
    let payload = create_payload(format!("http://{}/gzip", addr));

    let result = execute_request(payload).await;
    assert!(result.is_ok(), "Gzip request must succeed");

    let res = result.unwrap();
    assert_eq!(res.status_code, 200);
    assert_eq!(res.body, "Hello, compressed OpenPost!");
}

#[tokio::test]
async fn test_http_engine_multiple_set_cookie() {
    let addr = spawn_test_server().await;
    let payload = create_payload(format!("http://{}/multi-cookie", addr));

    let result = execute_request(payload).await;
    assert!(
        result.is_ok(),
        "Request returning multiple cookies must succeed"
    );

    let res = result.unwrap();
    assert_eq!(res.status_code, 200);
    assert_eq!(res.cookies.len(), 2, "Must extract both Set-Cookie headers");

    let cookie1 = &res.cookies[0];
    assert_eq!(cookie1.name, "session_id");
    assert_eq!(cookie1.value, "abc123xyz");
    assert_eq!(cookie1.path, Some("/".to_string()));
    assert_eq!(cookie1.http_only, Some(true));
    assert_eq!(cookie1.secure, Some(true));

    let cookie2 = &res.cookies[1];
    assert_eq!(cookie2.name, "preferences");
    assert_eq!(cookie2.value, "dark_mode");
    assert_eq!(cookie2.path, Some("/settings".to_string()));
    assert_eq!(
        cookie2.expires,
        Some("Wed, 21 Oct 2026 07:28:00 GMT".to_string())
    );
}
