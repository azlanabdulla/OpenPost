use std::fs;
use std::path::PathBuf;
use tauri::Manager;

fn get_drafts_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)
            .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    }

    Ok(app_dir.join("openpost_drafts.json"))
}

#[tauri::command]
pub async fn save_drafts(app: tauri::AppHandle, drafts_json: String) -> Result<(), String> {
    let path = get_drafts_path(&app)?;
    fs::write(&path, drafts_json)
        .map_err(|e| format!("Failed to write drafts to disk at {:?}: {}", path, e))?;
    Ok(())
}

#[tauri::command]
pub async fn load_drafts(app: tauri::AppHandle) -> Result<String, String> {
    let path = get_drafts_path(&app)?;
    if !path.exists() {
        return Ok("".to_string());
    }
    fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read drafts from {:?}: {}", path, e))
}
