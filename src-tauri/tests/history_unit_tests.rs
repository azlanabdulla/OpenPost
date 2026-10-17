#[path = "../src/models/history.rs"]
pub mod history_model;

pub mod models {
    pub mod history {
        pub use crate::history_model::*;
    }
}

#[path = "../src/db/history.rs"]
pub mod history_db;

pub mod db {
    pub mod history {
        pub use crate::history_db::*;
    }
}

use db::history::*;
use models::history::HistoryEntryPayload;
use rusqlite::Connection;
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};

fn create_test_entry(id: &str, timestamp: i64) -> HistoryEntryPayload {
    HistoryEntryPayload {
        id: id.to_string(),
        timestamp,
        method: "GET".to_string(),
        url: "https://api.example.com/items?query=search&api_key=secret123&page={{page_var}}"
            .to_string(),
        headers_json: serde_json::json!({
            "Authorization": "Bearer super-secret-token",
            "Content-Type": "application/json",
            "X-API-Key": "my-secret-key"
        })
        .to_string(),
        body: Some("{\"test\": 1}".to_string()),
        body_type: Some("json".to_string()),
        response_status: Some(200),
        response_status_text: Some("OK".to_string()),
        response_duration_ms: Some(150),
        response_size_bytes: Some(1024),
        error: None,
    }
}

#[test]
fn test_insert_and_get_history() {
    let conn = Connection::open_in_memory().unwrap();
    init_schema(&conn).unwrap();

    let entry = create_test_entry("req-1", 1000);
    insert_history_record(&conn, &entry, 100).unwrap();

    let history = get_history_records(&conn).unwrap();
    assert_eq!(history.len(), 1);
    assert_eq!(history[0].id, "req-1");
    assert_eq!(history[0].method, "GET");
    // Verify secrets are redacted in headers
    assert!(history[0].headers_json.contains("[REDACTED]"));
    assert!(!history[0].headers_json.contains("super-secret-token"));
    // Verify secrets in URL query params are redacted, but unresolved template variable is preserved
    assert!(history[0].url.contains("api_key=[REDACTED]"));
    assert!(history[0].url.contains("page={{page_var}}"));
}

#[test]
fn test_prune_to_limit_100() {
    let conn = Connection::open_in_memory().unwrap();
    init_schema(&conn).unwrap();

    // Insert 105 entries with increasing timestamps
    for i in 1..=105 {
        let entry = create_test_entry(&format!("req-{}", i), i as i64 * 100);
        insert_history_record(&conn, &entry, 100).unwrap();
    }

    let history = get_history_records(&conn).unwrap();
    // Count must strictly be 100
    assert_eq!(history.len(), 100);
    // The newest entry (req-105) must be first
    assert_eq!(history[0].id, "req-105");
    // The oldest remaining entry must be req-6 (req-1 to req-5 pruned)
    assert_eq!(history[99].id, "req-6");
}

#[test]
fn test_clear_history() {
    let conn = Connection::open_in_memory().unwrap();
    init_schema(&conn).unwrap();

    insert_history_record(&conn, &create_test_entry("req-1", 1000), 100).unwrap();
    insert_history_record(&conn, &create_test_entry("req-2", 2000), 100).unwrap();

    let history = get_history_records(&conn).unwrap();
    assert_eq!(history.len(), 2);

    clear_history_records(&conn).unwrap();
    let history_after = get_history_records(&conn).unwrap();
    assert_eq!(history_after.len(), 0);
}

#[test]
fn test_delete_single_history_item() {
    let conn = Connection::open_in_memory().unwrap();
    init_schema(&conn).unwrap();

    insert_history_record(&conn, &create_test_entry("req-1", 1000), 100).unwrap();
    insert_history_record(&conn, &create_test_entry("req-2", 2000), 100).unwrap();

    delete_history_record(&conn, "req-1").unwrap();
    let history = get_history_records(&conn).unwrap();
    assert_eq!(history.len(), 1);
    assert_eq!(history[0].id, "req-2");
}

#[test]
fn test_corrupt_db_recovery() {
    let temp_dir = std::env::temp_dir().join(format!(
        "openpost_test_{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ));
    let _ = fs::create_dir_all(&temp_dir);
    let db_path = temp_dir.join("history_corrupt_test.db");

    // Write completely corrupt non-sqlite data
    fs::write(&db_path, b"CORRUPTED INVALID HEADER AND GARBAGE BYTES").unwrap();

    // open_or_recover_db should detect corruption, rename file, and re-create a clean SQLite database
    let conn = open_or_recover_db(&db_path).expect("DB auto-recovery should succeed");

    // Verify the newly recovered DB works normally
    let entry = create_test_entry("req-recovered", 12345);
    insert_history_record(&conn, &entry, 100).unwrap();
    let records = get_history_records(&conn).unwrap();
    assert_eq!(records.len(), 1);
    assert_eq!(records[0].id, "req-recovered");

    // Verify a corrupt backup file was preserved on disk
    let corrupt_backups: Vec<_> = fs::read_dir(&temp_dir)
        .unwrap()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_name().to_string_lossy().contains("corrupt"))
        .collect();
    assert!(
        !corrupt_backups.is_empty(),
        "Corrupt file backup should exist"
    );

    // Cleanup
    let _ = fs::remove_dir_all(&temp_dir);
}

#[test]
fn test_sanitize_url_secrets() {
    let url = "https://api.example.com/data?token=secret99&apikey=key88&safe_param=hello&dyn={{vault_token}}";
    let sanitized = sanitize_url_secrets(url);
    assert!(sanitized.contains("token=[REDACTED]"));
    assert!(sanitized.contains("apikey=[REDACTED]"));
    assert!(sanitized.contains("safe_param=hello"));
    assert!(sanitized.contains("dyn={{vault_token}}"));
}
