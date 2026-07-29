//! Tauri command layer — thin, 1:1 `#[tauri::command]` wrappers over `core::api`.
//!
//! Each command locks the managed database, computes the backend's "today", and delegates to the
//! matching `core::api` function. No business logic lives here (the facade owns validation,
//! scheduling and event logging). Return values and the [`ApiError`] type are `serde`-serialized
//! across the bridge; the hand-kept `ui/src/lib/bindings.ts` mirrors these signatures 1:1.

use tauri::State;

use studdup_core::api::{self, ApiError, HistoryFilter};
use studdup_core::domain::{Card, Date, Exam, HistoryEvent, Method, Technique};

use crate::state::AppState;

/// A poisoned-mutex failure mapped to a typed error the UI can display.
fn poisoned() -> ApiError {
    ApiError::Database("banco de dados indisponível (mutex envenenado)".to_string())
}

/// Lock the DB and run `f` against its connection with the backend's current date.
macro_rules! with_db {
    ($state:expr, |$conn:ident, $today:ident| $body:expr) => {{
        let db = $state.db.lock().map_err(|_| poisoned())?;
        let $conn = db.conn();
        let $today = Date::today();
        $body
    }};
}

// ---- card actions ----

#[tauri::command]
pub fn create_card(state: State<'_, AppState>, card: Card) -> Result<Card, ApiError> {
    with_db!(state, |conn, today| api::create_card(conn, card, today))
}

#[tauri::command]
pub fn edit_card(state: State<'_, AppState>, card: Card) -> Result<Card, ApiError> {
    let db = state.db.lock().map_err(|_| poisoned())?;
    api::edit_card(db.conn(), card)
}

#[tauri::command]
pub fn complete_card(state: State<'_, AppState>, id: i64) -> Result<Card, ApiError> {
    with_db!(state, |conn, today| api::complete_card(conn, id, today))
}

#[tauri::command]
pub fn record_session(
    state: State<'_, AppState>,
    id: i64,
    focused_secs: u32,
    self_rating: Option<u8>,
) -> Result<Card, ApiError> {
    with_db!(state, |conn, today| api::record_session(
        conn,
        id,
        focused_secs,
        self_rating,
        today
    ))
}

#[tauri::command]
pub fn postpone_card(state: State<'_, AppState>, id: i64, days: i64) -> Result<Card, ApiError> {
    with_db!(state, |conn, today| api::postpone_card(
        conn, id, days, today
    ))
}

#[tauri::command]
pub fn restart_card(state: State<'_, AppState>, id: i64) -> Result<Card, ApiError> {
    with_db!(state, |conn, today| api::restart_card(conn, id, today))
}

#[tauri::command]
pub fn erase_card(state: State<'_, AppState>, id: i64) -> Result<Card, ApiError> {
    with_db!(state, |conn, today| api::erase_card(conn, id, today))
}

#[tauri::command]
pub fn revive_card(state: State<'_, AppState>, id: i64) -> Result<Card, ApiError> {
    with_db!(state, |conn, today| api::revive_card(conn, id, today))
}

#[tauri::command]
pub fn delete_card(state: State<'_, AppState>, id: i64) -> Result<(), ApiError> {
    let db = state.db.lock().map_err(|_| poisoned())?;
    api::delete_card(db.conn(), id)
}

// ---- exam actions ----

#[tauri::command]
pub fn create_exam(
    state: State<'_, AppState>,
    name: String,
    exam_date: Date,
) -> Result<Exam, ApiError> {
    with_db!(state, |conn, today| api::create_exam(
        conn, name, exam_date, today
    ))
}

#[tauri::command]
pub fn delete_exam(state: State<'_, AppState>, exam_id: i64) -> Result<(), ApiError> {
    let db = state.db.lock().map_err(|_| poisoned())?;
    api::delete_exam(db.conn(), exam_id)
}

// ---- reads ----

#[tauri::command]
pub fn list_board(state: State<'_, AppState>, method: Method) -> Result<Vec<Card>, ApiError> {
    with_db!(state, |conn, today| api::list_board(conn, method, today))
}

/// Unified (`method = None`) or per-method history, optionally narrowed by technique. The command
/// takes the two filter fields directly (primitive, `Deserialize`-friendly) and assembles the
/// `HistoryFilter` internally.
#[tauri::command]
pub fn list_history(
    state: State<'_, AppState>,
    method: Option<Method>,
    technique: Option<Technique>,
) -> Result<Vec<HistoryEvent>, ApiError> {
    let db = state.db.lock().map_err(|_| poisoned())?;
    api::list_history(db.conn(), HistoryFilter { method, technique })
}

/// All exams as read projections (days remaining + completed/total session progress), soonest first
/// (EXAM-01.6, EXAM-04). Drives the exams list/detail and the Prova board's rail.
#[tauri::command]
pub fn list_exams(state: State<'_, AppState>) -> Result<Vec<api::ExamView>, ApiError> {
    with_db!(state, |conn, today| api::list_exams(conn, today))
}

// ---- settings (global technique defaults, TECH-09.5) ----

#[tauri::command]
pub fn get_setting(state: State<'_, AppState>, key: String) -> Result<Option<String>, ApiError> {
    let db = state.db.lock().map_err(|_| poisoned())?;
    api::get_setting(db.conn(), &key)
}

#[tauri::command]
pub fn set_setting(state: State<'_, AppState>, key: String, value: String) -> Result<(), ApiError> {
    let db = state.db.lock().map_err(|_| poisoned())?;
    api::set_setting(db.conn(), &key, &value)
}
