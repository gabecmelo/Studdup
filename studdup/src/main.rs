// Hide the console window on Windows release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! Studdup Tauri app entry — thin bridge over `studdup-core`.
//!
//! Ports the shape of the C++ `main.cpp` app entry: resolve the platform database path, open and
//! forward-migrate it, and hold it in managed state. On a fatal DB error the app exits with a
//! message naming the path rather than opening a blank database (spec edge case / MIG). The
//! command registry is filled in by T17.

mod paths;
mod state;

fn main() {
    let db_path = paths::default_db_path();
    let app_state = match state::init_state(&db_path) {
        Ok(state) => state,
        Err(err) => {
            eprintln!(
                "Não foi possível abrir seus dados em {}: {err}",
                db_path.display()
            );
            std::process::exit(1);
        }
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running studdup");
}
