pub mod commands;
pub mod models;

use commands::drafts::{load_drafts, save_drafts};
use commands::http::execute_request;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            execute_request,
            save_drafts,
            load_drafts
        ])
        .run(tauri::generate_context!())
        .expect("error while running OpenPost desktop application");
}
