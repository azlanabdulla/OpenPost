pub mod commands;
pub mod db;
pub mod models;

#[cfg(not(test))]
use commands::drafts::{get_drafts_metadata, load_drafts, save_drafts};
#[cfg(not(test))]
use commands::history::{clear_history, delete_history_item, get_history, record_history_entry};
#[cfg(not(test))]
use commands::http::execute_request;
#[cfg(not(test))]
use commands::keychain::{
    delete_keychain_secret, get_keychain_secret, is_keychain_available, store_keychain_secret,
};

#[cfg(not(test))]
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            execute_request,
            save_drafts,
            load_drafts,
            get_drafts_metadata,
            get_history,
            record_history_entry,
            clear_history,
            delete_history_item,
            is_keychain_available,
            store_keychain_secret,
            get_keychain_secret,
            delete_keychain_secret
        ])
        .run(tauri::generate_context!())
        .expect("error while running OpenPost desktop application");
}
