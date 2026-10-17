use openpost_lib::db::history::{
    get_history_records, init_schema, insert_history_record, open_or_recover_db,
};
use openpost_lib::models::history::HistoryEntryPayload;
use std::path::PathBuf;

fn main() {
    // DB 1: 105 entries to verify rolling prune limit of 100
    let db1 = PathBuf::from("test_history_redaction.db");
    if db1.exists() {
        let _ = std::fs::remove_file(&db1);
    }
    let conn1 = open_or_recover_db(&db1).expect("Failed to open DB1");
    init_schema(&conn1).expect("Failed to init schema");
    for i in 1..=105 {
        let item = HistoryEntryPayload {
            id: format!("req-prune-{}", i),
            timestamp: 1729188000 + i as i64,
            method: if i % 2 == 0 { "GET".to_string() } else { "POST".to_string() },
            url: format!("https://api.example.com/resource/{}", i),
            headers_json: serde_json::json!({ "Accept": "application/json" }).to_string(),
            body: None,
            body_type: None,
            response_status: Some(200),
            response_status_text: Some("OK".to_string()),
            response_duration_ms: Some(50),
            response_size_bytes: Some(100),
            error: None,
        };
        insert_history_record(&conn1, &item, 100).expect("Failed to insert record");
    }
    let records1 = get_history_records(&conn1).expect("Failed to fetch records");
    println!("DB1 (rolling prune): stored {} records (capped at 100).", records1.len());

    // DB 2: Specific secret entry to verify column-level [REDACTED] storage
    let db2 = PathBuf::from("test_secrets_stored.db");
    if db2.exists() {
        let _ = std::fs::remove_file(&db2);
    }
    let conn2 = open_or_recover_db(&db2).expect("Failed to open DB2");
    init_schema(&conn2).expect("Failed to init schema");

    let secret_entry = HistoryEntryPayload {
        id: "req-with-credentials".to_string(),
        timestamp: 1729188500,
        method: "GET".to_string(),
        url: "https://api.example.com/v1/auth?token=super_secret_jwt_token_9999&api_key=sk_live_1234567890abcdef&safe_id=user_42&tpl={{vault_secret}}".to_string(),
        headers_json: serde_json::json!({
            "Authorization": "Bearer confidential_bearer_token_xyz",
            "Cookie": "session_id=confidential_session_cookie_abc",
            "X-API-Key": "confidential_api_key_777",
            "Accept": "application/json"
        }).to_string(),
        body: Some("{\"username\":\"admin\",\"password\":\"super_secret_password_never_log\"}".to_string()),
        body_type: Some("json".to_string()),
        response_status: Some(200),
        response_status_text: Some("OK".to_string()),
        response_duration_ms: Some(120),
        response_size_bytes: Some(256),
        error: None,
    };
    insert_history_record(&conn2, &secret_entry, 100).expect("Failed to insert secret entry");
    println!("DB2 (secret redaction): created test_secrets_stored.db successfully.");
}
