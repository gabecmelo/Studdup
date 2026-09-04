//! Studdup Tauri app library — the shared entry point for desktop and mobile.
//!
//! Both the desktop binary (`main.rs`) and the generated Android project call [`run`], which
//! builds the Tauri app: registers the plugins and the command handlers, then — in the setup hook,
//! where the platform path API is available — resolves the database path per platform, opens and
//! forward-migrates it, and holds it in managed state. On a fatal DB error the desktop exits with a
//! message naming the path; mobile surfaces the failure to Tauri instead of `process::exit`, so a
//! blank database is never opened (spec edge case / MIG / DATA-04).

use std::path::{Path, PathBuf};

use tauri::Manager;

mod commands;
mod paths;
mod state;

/// Build and run the Tauri application. Shared by the desktop binary (`main.rs`) and the generated
/// mobile (Android) entry point, which Tauri wires up via the `mobile_entry_point` attribute.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let db_path = resolve_db_path(app)?;
            match state::init_state(&db_path) {
                Ok(state) => {
                    app.manage(state);
                    Ok(())
                }
                Err(err) => Err(fatal_db_error(&db_path, &err)),
            }
        })
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

/// Resolve the SQLite path for the current platform. Desktop keeps the env-based
/// [`paths::default_db_path`] (DATA-03, unchanged); Android uses the app-private data directory
/// from Tauri's path API (DATA-01), creating it if needed.
fn resolve_db_path(app: &tauri::App) -> Result<PathBuf, Box<dyn std::error::Error>> {
    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        Ok(paths::default_db_path())
    }
    #[cfg(target_os = "android")]
    {
        let dir = app.path().app_data_dir()?;
        std::fs::create_dir_all(&dir)?;
        Ok(paths::mobile_db_path(&dir))
    }
}

/// What to do when the database cannot be opened/migrated, decided purely by platform so both arms
/// are unit-testable on the host (DATA-04): mobile **surfaces** the error to Tauri (never exits, so
/// the Android activity is not killed and a blank DB is never opened); desktop **exits** the process
/// with a message, as the C++ app did.
#[derive(Debug, PartialEq, Eq)]
enum FatalAction {
    Exit,
    Surface,
}

/// Pure selector for [`FatalAction`]. Mobile surfaces; every other platform exits.
fn fatal_action(is_mobile: bool) -> FatalAction {
    if is_mobile {
        FatalAction::Surface
    } else {
        FatalAction::Exit
    }
}

/// Handle a fatal database open/migration failure. Desktop keeps the historical exit-with-message;
/// mobile must never `process::exit` (that kills the Android activity abruptly), so it returns the
/// error to Tauri instead — either way a blank database is never opened (DATA-04). The exit-vs-surface
/// decision is delegated to the pure [`fatal_action`] so it is testable without a mobile target.
fn fatal_db_error(db_path: &Path, err: &state::StateInitError) -> Box<dyn std::error::Error> {
    let message = format!(
        "Não foi possível abrir seus dados em {}: {err}",
        db_path.display()
    );
    eprintln!("{message}");
    match fatal_action(cfg!(mobile)) {
        FatalAction::Exit => std::process::exit(1),
        FatalAction::Surface => message.into(),
    }
}

#[cfg(test)]
mod tests {
    use super::{fatal_action, FatalAction};

    #[test]
    fn mobile_surfaces_the_error_never_exits() {
        // DATA-04: on mobile the fatal path must return the error to Tauri, not kill the process.
        assert_eq!(fatal_action(true), FatalAction::Surface);
    }

    #[test]
    fn desktop_exits_on_fatal_db_error() {
        // Desktop keeps the historical exit-with-message behavior.
        assert_eq!(fatal_action(false), FatalAction::Exit);
    }
}
