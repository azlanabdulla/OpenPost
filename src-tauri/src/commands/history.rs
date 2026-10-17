use crate::db::history::{
    clear_history_records, delete_history_record, get_history_records, insert_history_record,
    open_or_recover_db,
};
use crate::models::history::HistoryEntryPayload;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

fn get_history_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)
            .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    }

    Ok(app_dir.join("history.db"))
}

#[tauri::command]
pub async fn get_history(app: AppHandle) -> Result<Vec<HistoryEntryPayload>, String> {
    let db_path = get_history_db_path(&app)?;
    let conn = open_or_recover_db(&db_path)?;
    get_history_records(&conn)
}

#[tauri::command]
pub async fn record_history_entry(
    app: AppHandle,
    entry: HistoryEntryPayload,
    max_limit: Option<usize>,
) -> Result<(), String> {
    let db_path = get_history_db_path(&app)?;
    let conn = open_or_recover_db(&db_path)?;
    insert_history_record(&conn, &entry, max_limit.unwrap_or(100))
}

#[tauri::command]
pub async fn clear_history(app: AppHandle) -> Result<(), String> {
    let db_path = get_history_db_path(&app)?;
    let conn = open_or_recover_db(&db_path)?;
    clear_history_records(&conn)
}

#[tauri::command]
pub async fn delete_history_item(app: AppHandle, id: String) -> Result<(), String> {
    let db_path = get_history_db_path(&app)?;
    let conn = open_or_recover_db(&db_path)?;
    delete_history_record(&conn, &id)
}
