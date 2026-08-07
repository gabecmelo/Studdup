//! Studdup Tauri app library — the shared entry point for desktop and mobile.
//!
//! Both the desktop binary (`main.rs`) and the generated Android project call [`run`], which
//! builds the Tauri app: registers the plugins and the command handlers, opens and
//! forward-migrates the platform database, and holds it in managed state. On a fatal DB error the
//! app exits with a message naming the path rather than opening a blank database (spec edge case /
//! MIG).

mod commands;
mod paths;
mod state;

/// Build and run the Tauri application. Shared by the desktop binary (`main.rs`) and the generated
/// mobile (Android) entry point, which Tauri wires up via the `mobile_entry_point` attribute.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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
        .invoke_handler(tauri::generate_handler![
            commands::create_card,
            commands::edit_card,
            commands::complete_card,
            commands::record_session,
            commands::postpone_card,
            commands::restart_card,
            commands::erase_card,
            commands::revive_card,
            commands::delete_card,
            commands::create_exam,
            commands::delete_exam,
            commands::list_board,
            commands::list_history,
            commands::list_exams,
            commands::list_session_cursors,
            commands::get_setting,
            commands::set_setting,
            commands::record_attempt,
            commands::list_attempts,
            commands::add_leitner_item,
            commands::list_leitner_items,
            commands::list_due_leitner_items,
            commands::review_leitner_item,
        ])
        .run(tauri::generate_context!())
        .expect("error while running studdup");
}
