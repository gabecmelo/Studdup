// Hide the console window on Windows release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! Studdup Tauri app entry — thin bridge over `studdup-core`.
//!
//! Ports the shape of the C++ `main.cpp` app entry. The command registry is intentionally
//! empty here; `core::api` commands and the migrated DB connection land in later phases.

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running studdup");
}
