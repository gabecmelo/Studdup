//! `core::api` — the single orchestration facade the Tauri bridge calls.
//!
//! One function per user action, tying `scheduler` + `repository` + event logging together in
//! one place (the C++ `App::apply*` pattern), so the command layer stays dumb. Every function
//! validates its inputs and returns a typed [`ApiError`] on failure (the design's Error Handling
//! table): title length 1–200, estimated session length 5–180 minutes, exam date within
//! `[today, today + 5 years]`.
//!
//! Actions dispatch on `Method` (C1 hybrid): spaced cards re-anchor `start_date` on the fixed
//! ladder, exam cards advance their materialized `ExamSession` cursor.

use std::fmt;

use rusqlite::Connection;
use serde::Serialize;

use crate::domain::{Card, Date, Exam, HistoryEvent, Method, Stage};
use crate::repository::{cards, events, exams};
use crate::scheduler::{exam, spaced};

pub use crate::repository::events::HistoryFilter;

/// Inclusive card-title length bounds (spec edge cases; empty/oversize rejected).
const TITLE_MAX: usize = 200;
/// Inclusive estimated-session-length bounds in minutes (TECH-09).
const EST_MIN: u16 = 5;
const EST_MAX: u16 = 180;
/// How many calendar years ahead an exam date may be before it is rejected as implausible.
const EXAM_MAX_YEARS: i32 = 5;

/// A typed failure returned across the facade. Serializable so the Tauri bridge can forward it
/// to the UI (which renders the inline field errors and rollback toasts).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", content = "detail")]
pub enum ApiError {
    /// Card title was empty or whitespace-only.
    EmptyTitle,
    /// Card title exceeded [`TITLE_MAX`] characters.
    TitleTooLong { max: usize, actual: usize },
    /// Estimated session length fell outside [`EST_MIN`]..=[`EST_MAX`].
    EstOutOfRange { min: u16, max: u16, actual: u16 },
    /// Exam name was empty or whitespace-only.
    EmptyExamName,
    /// Exam target date was earlier than today.
    ExamDateInPast,
    /// Exam target date was more than [`EXAM_MAX_YEARS`] years out.
    ExamDateTooFar { max: String },
    /// No exam exists with the referenced id.
    ExamNotFound(i64),
    /// No card exists with the referenced id.
    CardNotFound(i64),
    /// An underlying SQLite error (stringified — `rusqlite::Error` is not `Serialize`).
    Database(String),
}

impl fmt::Display for ApiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ApiError::EmptyTitle => write!(f, "o título não pode ficar vazio"),
            ApiError::TitleTooLong { max, actual } => {
                write!(f, "o título tem {actual} caracteres (máximo {max})")
            }
            ApiError::EstOutOfRange { min, max, actual } => write!(
                f,
                "a duração estimada {actual} min está fora do intervalo {min}–{max}"
            ),
            ApiError::EmptyExamName => write!(f, "o nome da prova não pode ficar vazio"),
            ApiError::ExamDateInPast => write!(f, "a data da prova deve ser hoje ou depois"),
            ApiError::ExamDateTooFar { max } => {
                write!(f, "a data da prova deve ser até {max}")
            }
            ApiError::ExamNotFound(id) => write!(f, "prova {id} não encontrada"),
            ApiError::CardNotFound(id) => write!(f, "card {id} não encontrado"),
            ApiError::Database(msg) => write!(f, "erro de banco de dados: {msg}"),
        }
    }
}

impl std::error::Error for ApiError {}

impl From<rusqlite::Error> for ApiError {
    fn from(e: rusqlite::Error) -> Self {
        ApiError::Database(e.to_string())
    }
}

// ---- validation ----

/// Reject empty/whitespace-only or over-long titles (1–200 chars, counting characters).
fn validate_title(title: &str) -> Result<(), ApiError> {
    if title.trim().is_empty() {
        return Err(ApiError::EmptyTitle);
    }
    let len = title.chars().count();
    if len > TITLE_MAX {
        return Err(ApiError::TitleTooLong {
            max: TITLE_MAX,
            actual: len,
        });
    }
    Ok(())
}

/// Reject an estimated session length outside 5–180 minutes (only checked when one is set).
fn validate_est(est: Option<u16>) -> Result<(), ApiError> {
    if let Some(v) = est {
        if !(EST_MIN..=EST_MAX).contains(&v) {
            return Err(ApiError::EstOutOfRange {
                min: EST_MIN,
                max: EST_MAX,
                actual: v,
            });
        }
    }
    Ok(())
}

/// The latest acceptable exam date: [`EXAM_MAX_YEARS`] calendar years ahead, clamping a
/// Feb-29 anchor to Feb-28 when the target year is not a leap year.
fn max_exam_date(today: Date) -> Date {
    let year = today.year() + EXAM_MAX_YEARS;
    Date::from_ymd(year, today.month(), today.day()).unwrap_or_else(|| {
        Date::from_ymd(year, today.month(), 28).expect("month/28 is always valid")
    })
}

// ---- event logging ----

/// Record a history event carrying the card's current method/technique (HIST-04) plus the
/// stage transition and optional session payload (TECH-03).
#[allow(clippy::too_many_arguments)]
fn log_event(
    conn: &Connection,
    card: &Card,
    kind: &str,
    from: Stage,
    to: Stage,
    when: Date,
    focused_secs: Option<u32>,
    self_rating: Option<u8>,
) -> Result<(), ApiError> {
    let ev = HistoryEvent {
        id: 0,
        card_id: card.id,
        kind: kind.to_string(),
        from_stage: from,
        to_stage: to,
        method: card.method,
        technique: card.technique,
        focused_secs,
        self_rating,
        when,
    };
    events::record_event(conn, &ev)?;
    Ok(())
}

fn load_exam(conn: &Connection, exam_id: i64) -> Result<Option<Exam>, ApiError> {
    Ok(exams::load_exams(conn)?
        .into_iter()
        .find(|e| e.id == exam_id))
}

// ---- card actions ----

/// Create a card under its method (fixed at creation, AD-001). Validates the title and estimate,
/// anchors a fresh spaced study at Day 0 today, and — for an exam card — materializes its session
/// schedule from today to the exam date (EXAM-02). Records a `created` event.
pub fn create_card(conn: &Connection, mut card: Card, today: Date) -> Result<Card, ApiError> {
    validate_title(&card.title)?;
    validate_est(card.est_minutes)?;

    // Resolve the exam schedule up front — before any write — so a bad reference fails as a
    // typed `ExamNotFound` rather than a raw foreign-key error at insert time.
    let session_dates = match (card.method, card.exam_id) {
        (Method::ExamPrep, Some(exam_id)) => {
            let exam = load_exam(conn, exam_id)?.ok_or(ApiError::ExamNotFound(exam_id))?;
            Some(exam::distribute(today, exam.exam_date))
        }
        _ => None,
    };

    // Normalize the schedule anchors for a brand-new card.
    card.id = 0;
    card.archived = false;
    card.created_at = today;
    card.last_completed_at = None;
    card.start_date = today;
    card.current_stage = Stage::Day0;

    let id = cards::insert_card(conn, &card)?;
    card.id = id;

    if let Some(dates) = session_dates {
        exams::insert_sessions(conn, id, &dates)?;
    }

    log_event(
        conn,
        &card,
        "created",
        Stage::Day0,
        Stage::Day0,
        today,
        None,
        None,
    )?;
    Ok(card)
}

/// Persist edits to an existing card (title, links, technique, estimate, rhythm). Does not touch
/// the schedule or method. Validates the title and estimate; records no history event.
pub fn edit_card(conn: &Connection, card: Card) -> Result<Card, ApiError> {
    validate_title(&card.title)?;
    validate_est(card.est_minutes)?;
    cards::update_card(conn, &card)?;
    Ok(card)
}

/// Complete the current session of a card, dispatching by method. Idempotent within a day
/// (a second completion the same day is a no-op — spec edge case).
pub fn complete_card(conn: &Connection, id: i64, today: Date) -> Result<Card, ApiError> {
    complete_inner(conn, id, today, None, None)
}

/// Complete a card from a technique session, recording the elapsed focused seconds and optional
/// self-rating on the event (TECH-03/06). Same idempotency and dispatch as [`complete_card`].
pub fn record_session(
    conn: &Connection,
    id: i64,
    focused_secs: u32,
    self_rating: Option<u8>,
    today: Date,
) -> Result<Card, ApiError> {
    complete_inner(conn, id, today, Some(focused_secs), self_rating)
}

fn complete_inner(
    conn: &Connection,
    id: i64,
    today: Date,
    focused_secs: Option<u32>,
    self_rating: Option<u8>,
) -> Result<Card, ApiError> {
    let card = cards::load_card(conn, id)?.ok_or(ApiError::CardNotFound(id))?;
    match card.method {
        Method::SpacedRepetition => complete_spaced(conn, card, today, focused_secs, self_rating),
        Method::ExamPrep => complete_exam(conn, card, today, focused_secs, self_rating),
    }
}

fn complete_spaced(
    conn: &Connection,
    card: Card,
    today: Date,
    focused_secs: Option<u32>,
    self_rating: Option<u8>,
) -> Result<Card, ApiError> {
    // Nothing to complete on an archived / finished card.
    if card.archived || card.current_stage == Stage::Done {
        return Ok(card);
    }
    // Idempotent per day: a same-day repeat advances nothing and logs nothing (spec edge case).
    if card.last_completed_at == Some(today) {
        return Ok(card);
    }
    let from = card.current_stage;
    let updated = spaced::mark_completed(card, today);
    cards::update_card(conn, &updated)?;
    log_event(
        conn,
        &updated,
        "completed",
        from,
        updated.current_stage,
        today,
        focused_secs,
        self_rating,
    )?;
    Ok(updated)
}

fn complete_exam(
    conn: &Connection,
    mut card: Card,
    today: Date,
    focused_secs: Option<u32>,
    self_rating: Option<u8>,
) -> Result<Card, ApiError> {
    let sessions = exams::load_sessions(conn, card.id)?;
    // Idempotent per day: if a session was already completed today, do nothing.
    if sessions.iter().any(|s| s.completed_at == Some(today)) {
        return Ok(card);
    }
    // The cursor session (first uncompleted by `seq`) is the one being completed.
    let cursor = sessions
        .iter()
        .filter(|s| s.completed_at.is_none())
        .min_by_key(|s| s.seq)
        .cloned();
    let Some(cursor) = cursor else {
        return Ok(card); // already fully studied
    };
    exams::advance_session(conn, cursor.id, today)?;

    // Let the scheduler decide whether that was the last session (→ archive the card).
    let advance = exam::mark_session_completed(sessions, today);
    if advance.archived {
        card.archived = true;
        card.last_completed_at = Some(today);
        cards::update_card(conn, &card)?;
    }
    log_event(
        conn,
        &card,
        "completed",
        card.current_stage,
        card.current_stage,
        today,
        focused_secs,
        self_rating,
    )?;
    Ok(card)
}

/// Reschedule a card by `days` (drag Hoje→Amanhã = +1). Spaced cards move `start_date` (keeping
/// the stage-anchor invariant, AD-003); exam cards shift only their current cursor session.
/// Records a `postponed` event.
pub fn postpone_card(conn: &Connection, id: i64, days: i64, today: Date) -> Result<Card, ApiError> {
    let card = cards::load_card(conn, id)?.ok_or(ApiError::CardNotFound(id))?;
    match card.method {
        Method::SpacedRepetition => {
            let from = card.current_stage;
            let updated = spaced::postpone(card, days);
            cards::update_card(conn, &updated)?;
            log_event(conn, &updated, "postponed", from, from, today, None, None)?;
            Ok(updated)
        }
        Method::ExamPrep => {
            let sessions = exams::load_sessions(conn, card.id)?;
            if let Some(cursor) = sessions
                .iter()
                .filter(|s| s.completed_at.is_none())
                .min_by_key(|s| s.seq)
            {
                exams::set_session_due_date(conn, cursor.id, cursor.due_date.add_days(days))?;
            }
            log_event(
                conn,
                &card,
                "postponed",
                card.current_stage,
                card.current_stage,
                today,
                None,
                None,
            )?;
            Ok(card)
        }
    }
}

/// Restart an overdue spaced study: keep the stage, force it due today (re-anchor `start_date`).
/// Records a `restart` event. Port of the C++ overdue "Recomeçar" action (HIST-05).
pub fn restart_card(conn: &Connection, id: i64, today: Date) -> Result<Card, ApiError> {
    let card = cards::load_card(conn, id)?.ok_or(ApiError::CardNotFound(id))?;
    let stage = card.current_stage;
    let updated = spaced::restart_study(card, today);
    cards::update_card(conn, &updated)?;
    log_event(conn, &updated, "restart", stage, stage, today, None, None)?;
    Ok(updated)
}

/// Erase an overdue spaced study: discard progress and start fresh at Day 0 today.
/// Records an `erase` event.
pub fn erase_card(conn: &Connection, id: i64, today: Date) -> Result<Card, ApiError> {
    let card = cards::load_card(conn, id)?.ok_or(ApiError::CardNotFound(id))?;
    let from = card.current_stage;
    let updated = spaced::erase_study(card, today);
    cards::update_card(conn, &updated)?;
    log_event(
        conn,
        &updated,
        "erase",
        from,
        updated.current_stage,
        today,
        None,
        None,
    )?;
    Ok(updated)
}

/// Revive an archived card from history as a fresh Day-0 study in its original method (HIST-05).
/// Records a `revived` event.
pub fn revive_card(conn: &Connection, id: i64, today: Date) -> Result<Card, ApiError> {
    let card = cards::load_card(conn, id)?.ok_or(ApiError::CardNotFound(id))?;
    let from = card.current_stage;
    let updated = spaced::revive(card, today);
    cards::update_card(conn, &updated)?;
    log_event(
        conn,
        &updated,
        "revived",
        from,
        updated.current_stage,
        today,
        None,
        None,
    )?;
    Ok(updated)
}

/// Delete a card; its sessions, history events and Leitner items cascade away (spec edge case).
pub fn delete_card(conn: &Connection, id: i64) -> Result<(), ApiError> {
    cards::delete_card(conn, id)?;
    Ok(())
}

// ---- exam actions ----

/// Create an exam after validating its name and target date (today ≤ date ≤ today + 5 years,
/// EXAM-01 + spec edge cases).
pub fn create_exam(
    conn: &Connection,
    name: String,
    exam_date: Date,
    today: Date,
) -> Result<Exam, ApiError> {
    if name.trim().is_empty() {
        return Err(ApiError::EmptyExamName);
    }
    if exam_date < today {
        return Err(ApiError::ExamDateInPast);
    }
    let max = max_exam_date(today);
    if exam_date > max {
        return Err(ApiError::ExamDateTooFar { max: max.to_iso() });
    }
    let exam = Exam {
        id: 0,
        name,
        exam_date,
        created_at: today,
        concluded: false,
    };
    let id = exams::insert_exam(conn, &exam)?;
    Ok(Exam { id, ..exam })
}

/// Delete an exam and, by cascade, all of its cards and their sessions/history/items (EXAM-04).
pub fn delete_exam(conn: &Connection, exam_id: i64) -> Result<(), ApiError> {
    exams::delete_exam_cascade(conn, exam_id)?;
    Ok(())
}

// ---- reads ----

/// The active (non-archived) cards for a method — the kanban board's source (METH-02, KAN-01).
pub fn list_board(conn: &Connection, method: Method) -> Result<Vec<Card>, ApiError> {
    Ok(cards::load_active(conn, method)?)
}

/// History events matching `filter`: per-method (HIST-01) or the unified labeled view (HIST-02),
/// optionally narrowed by technique (HIST-03). The caller derives the result count from the len.
pub fn list_history(
    conn: &Connection,
    filter: HistoryFilter,
) -> Result<Vec<HistoryEvent>, ApiError> {
    Ok(events::load_history(conn, &filter)?)
}

/// A read projection of an exam for the exams list / detail (EXAM-01.6, EXAM-04): the exam plus the
/// whole days remaining until its target date and the completed/total session counts across all of
/// its cards. Composed from `load_exams` + `exam_session_progress`. Serializable for the bridge.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct ExamView {
    pub id: i64,
    pub name: String,
    pub exam_date: Date,
    pub created_at: Date,
    pub concluded: bool,
    /// Whole days from `today` to the exam date (negative once the date has passed).
    pub days_remaining: i64,
    /// Sessions already completed across every card of this exam.
    pub completed_sessions: i64,
    /// Total sessions materialized across every card of this exam.
    pub total_sessions: i64,
}

/// List every exam (soonest target date first) as a read projection carrying its days-remaining and
/// completed-vs-total session progress (EXAM-01.6, EXAM-04). Surfaces the repository's `load_exams`
/// + `exam_session_progress` that had no facade entry point before.
pub fn list_exams(conn: &Connection, today: Date) -> Result<Vec<ExamView>, ApiError> {
    let mut views = Vec::new();
    for e in exams::load_exams(conn)? {
        let (completed, total) = exams::exam_session_progress(conn, e.id)?;
        views.push(ExamView {
            id: e.id,
            name: e.name,
            exam_date: e.exam_date,
            created_at: e.created_at,
            concluded: e.concluded,
            days_remaining: today.days_until(e.exam_date),
            completed_sessions: completed,
            total_sessions: total,
        });
    }
    Ok(views)
}
