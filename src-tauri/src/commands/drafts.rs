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
    let temp_path = path.with_extension("tmp");

    // 1. Write atomically to temp file
    fs::write(&temp_path, &drafts_json).map_err(|e| {
        format!(
            "WRITE_FAILED: Failed to write to temporary file {:?}: {}",
            temp_path, e
        )
    })?;

    // 2. Atomically rename temp file over destination
    fs::rename(&temp_path, &path).map_err(|e| {
        format!(
            "WRITE_FAILED: Failed to atomically commit drafts to {:?}: {}",
            path, e
        )
    })?;

    // 3. Keep a backup of the latest valid draft file
    let bak_path = path.with_extension("bak");
    let _ = fs::copy(&path, &bak_path);

    Ok(())
}

#[tauri::command]
pub async fn load_drafts(app: tauri::AppHandle) -> Result<String, String> {
    let path = get_drafts_path(&app)?;
    if !path.exists() {
        return Ok("".to_string());
    }

    match fs::read_to_string(&path) {
        Ok(content) => {
            // Check if file is valid JSON
            if serde_json::from_str::<serde_json::Value>(&content).is_err() {
                // Main draft file is corrupted; attempt recovery from backup
                let bak_path = path.with_extension("bak");
                if bak_path.exists() {
                    if let Ok(bak_content) = fs::read_to_string(&bak_path) {
                        if serde_json::from_str::<serde_json::Value>(&bak_content).is_ok() {
                            return Ok(format!("RESTORED_FROM_BACKUP:{}", bak_content));
                        }
                    }
                }
                return Err(format!(
                    "CORRUPTED_FILE: Drafts file at {:?} is corrupted and has invalid JSON",
                    path
                ));
            }
            Ok(content)
        }
        Err(e) => Err(format!(
            "READ_FAILED: Failed to read drafts from {:?}: {}",
            path, e
        )),
    }
}

#[tauri::command]
pub async fn get_drafts_metadata(app: tauri::AppHandle) -> Result<u64, String> {
    let path = get_drafts_path(&app)?;
    if !path.exists() {
        return Ok(0);
    }
    let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
    let modified = metadata.modified().map_err(|e| e.to_string())?;
    let duration = modified
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?;
    Ok(duration.as_millis() as u64)
}
