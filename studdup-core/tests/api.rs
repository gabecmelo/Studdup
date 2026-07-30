//! T15 — `core::api` facade integration tests: each action's happy path, the validation/error
//! scenarios from the design's Error Handling table, and per-day completion idempotency.

use studdup_core::api::{
    self, create_card, create_exam, delete_card, delete_exam, edit_card, ApiError, HistoryFilter,
};
use studdup_core::domain::{AttemptKind, Card, Date, Method, PomodoroRhythm, Stage, Technique};
use studdup_core::repository::cards::load_card;
use studdup_core::repository::exams::{load_exams, load_sessions};
use studdup_core::repository::Db;
use studdup_core::scheduler::spaced::due_date;

fn ymd(y: i32, m: u8, d: u8) -> Date {
    Date::from_ymd(y, m, d).unwrap()
}

/// A fresh in-memory DB with the full schema (FK cascade enabled by the connection pragmas).
fn db() -> Db {
    let db = Db::open_in_memory().unwrap();
    db.create_schema().unwrap();
    db
}

/// A minimal spaced card the facade will normalize on create.
fn new_spaced(title: &str) -> Card {
    Card {
        id: 0,
        title: title.to_string(),
        content_link: String::new(),
        review_link: String::new(),
        method: Method::SpacedRepetition,
        technique: None,
        est_minutes: None,
        pomodoro: None,
        start_date: ymd(2000, 1, 1), // deliberately stale — create_card must re-anchor to today
        current_stage: Stage::Day30, // deliberately wrong — create_card must reset to Day0
        exam_id: None,
        created_at: ymd(2000, 1, 1),
        last_completed_at: None,
        archived: false,
    }
}

// ---- create_card: happy path + validation ----

#[test]
fn create_card_anchors_a_fresh_day0_study_and_logs_created() {
    let db = db();
    let today = ymd(2026, 5, 1);

    let card = create_card(db.conn(), new_spaced("Integrais"), today).unwrap();

    assert!(card.id > 0);
    assert_eq!(card.current_stage, Stage::Day0);
    assert_eq!(card.start_date, today, "start_date re-anchored to today");
    assert_eq!(card.created_at, today);
    assert!(!card.archived);
    assert_eq!(due_date(&card), today, "Day 0 due today");

    // Exactly one `created` event was recorded.
    let events = api::list_history(db.conn(), HistoryFilter::all()).unwrap();
    assert_eq!(events.len(), 1);
    assert_eq!(events[0].kind, "created");
    assert_eq!(events[0].card_id, card.id);
    assert_eq!(events[0].method, Method::SpacedRepetition);
}

#[test]
fn create_card_rejects_empty_and_whitespace_titles() {
    let db = db();
    let today = ymd(2026, 5, 1);
    assert_eq!(
        create_card(db.conn(), new_spaced(""), today).unwrap_err(),
        ApiError::EmptyTitle
    );
    assert_eq!(
        create_card(db.conn(), new_spaced("   \t "), today).unwrap_err(),
        ApiError::EmptyTitle
    );
}

#[test]
fn create_card_rejects_title_over_200_chars() {
    let db = db();
    let today = ymd(2026, 5, 1);

    // 200 chars is accepted (boundary), 201 is rejected.
    let ok = "a".repeat(200);
    assert!(create_card(db.conn(), new_spaced(&ok), today).is_ok());

    let too_long = "a".repeat(201);
    assert_eq!(
        create_card(db.conn(), new_spaced(&too_long), today).unwrap_err(),
        ApiError::TitleTooLong {
            max: 200,
            actual: 201
        }
    );
}

#[test]
fn create_card_rejects_estimate_outside_5_to_180() {
    let db = db();
    let today = ymd(2026, 5, 1);

    let mut low = new_spaced("Baixo");
    low.technique = Some(Technique::Pomodoro);
    low.est_minutes = Some(4);
    assert_eq!(
        create_card(db.conn(), low, today).unwrap_err(),
        ApiError::EstOutOfRange {
            min: 5,
            max: 180,
            actual: 4
        }
    );

    let mut high = new_spaced("Alto");
    high.est_minutes = Some(181);
    assert_eq!(
        create_card(db.conn(), high, today).unwrap_err(),
        ApiError::EstOutOfRange {
            min: 5,
            max: 180,
            actual: 181
        }
    );

    // The inclusive boundaries are accepted.
    let mut lo_ok = new_spaced("5min");
    lo_ok.est_minutes = Some(5);
    assert!(create_card(db.conn(), lo_ok, today).is_ok());
    let mut hi_ok = new_spaced("180min");
    hi_ok.est_minutes = Some(180);
    assert!(create_card(db.conn(), hi_ok, today).is_ok());
}

// ---- complete_card: spaced happy path + per-day idempotency ----

#[test]
fn complete_card_advances_stage_and_records_one_event() {
    let db = db();
    let today = ymd(2026, 5, 1);
    let card = create_card(db.conn(), new_spaced("Derivadas"), today).unwrap();

    let done = api::complete_card(db.conn(), card.id, today).unwrap();
    assert_eq!(done.current_stage, Stage::Day1, "Day0 → Day1");
    assert_eq!(done.last_completed_at, Some(today));
    assert_eq!(due_date(&done), today.add_days(1));

    let completed: Vec<_> = api::list_history(db.conn(), HistoryFilter::all())
        .unwrap()
        .into_iter()
        .filter(|e| e.kind == "completed")
        .collect();
    assert_eq!(completed.len(), 1);
    assert_eq!(completed[0].from_stage, Stage::Day0);
    assert_eq!(completed[0].to_stage, Stage::Day1);
}

#[test]
fn double_complete_same_day_is_idempotent() {
    let db = db();
    let today = ymd(2026, 5, 1);
    let card = create_card(db.conn(), new_spaced("Limites"), today).unwrap();

    let first = api::complete_card(db.conn(), card.id, today).unwrap();
    let second = api::complete_card(db.conn(), card.id, today).unwrap();

    // Stage advanced exactly once; the second call is a no-op.
    assert_eq!(first.current_stage, Stage::Day1);
    assert_eq!(second.current_stage, Stage::Day1);

    let completed = api::list_history(db.conn(), HistoryFilter::all())
        .unwrap()
        .into_iter()
        .filter(|e| e.kind == "completed")
        .count();
    assert_eq!(
        completed, 1,
        "only one completed event for two same-day clicks"
    );

    // A completion the next day advances again.
    let tomorrow = today.add_days(1);
    let third = api::complete_card(db.conn(), card.id, tomorrow).unwrap();
    assert_eq!(third.current_stage, Stage::Day2);
}

#[test]
fn completing_day30_archives_the_card() {
    let db = db();
    let today = ymd(2026, 5, 1);
    let card = create_card(db.conn(), new_spaced("Quase lá"), today).unwrap();
    // Fast-forward the stored card to Day30 via edit.
    let mut at_day30 = card.clone();
    at_day30.current_stage = Stage::Day30;
    edit_card(db.conn(), at_day30).unwrap();

    let done = api::complete_card(db.conn(), card.id, today).unwrap();
    assert_eq!(done.current_stage, Stage::Done);
    assert!(done.archived);
}

// ---- postpone / restart / erase / revive ----

#[test]
fn postpone_card_shifts_due_date_without_changing_stage() {
    let db = db();
    let today = ymd(2026, 5, 1);
    let card = create_card(db.conn(), new_spaced("Adiar"), today).unwrap();

    let moved = api::postpone_card(db.conn(), card.id, 1, today).unwrap();
    assert_eq!(moved.current_stage, Stage::Day0, "stage unchanged");
    assert_eq!(due_date(&moved), today.add_days(1), "due date +1");
}

#[test]
fn restart_card_keeps_stage_and_forces_due_today() {
    let db = db();
    let created = ymd(2026, 5, 1);
    let card = create_card(db.conn(), new_spaced("Atrasada"), created).unwrap();
    // Advance to Day2, then let time pass so it is overdue.
    let card = api::complete_card(db.conn(), card.id, created).unwrap(); // Day1
    let card = api::complete_card(db.conn(), card.id, created.add_days(1)).unwrap(); // Day2
    let much_later = created.add_days(30);

    let restarted = api::restart_card(db.conn(), card.id, much_later).unwrap();
    assert_eq!(restarted.current_stage, Stage::Day2, "stage preserved");
    assert_eq!(due_date(&restarted), much_later, "forced due today");
}

#[test]
fn erase_card_resets_to_day0_today() {
    let db = db();
    let created = ymd(2026, 5, 1);
    let card = create_card(db.conn(), new_spaced("Recomeçar"), created).unwrap();
    let card = api::complete_card(db.conn(), card.id, created).unwrap(); // Day1
    let later = created.add_days(10);

    let erased = api::erase_card(db.conn(), card.id, later).unwrap();
    assert_eq!(erased.current_stage, Stage::Day0);
    assert_eq!(erased.start_date, later);
    assert_eq!(due_date(&erased), later);
    assert!(!erased.archived);
}

#[test]
fn revive_card_returns_archived_card_as_fresh_day0() {
    let db = db();
    let today = ymd(2026, 5, 1);
    let card = create_card(db.conn(), new_spaced("Arquivada"), today).unwrap();
    // Archive it directly via edit.
    let mut archived = card.clone();
    archived.archived = true;
    archived.current_stage = Stage::Done;
    archived.last_completed_at = Some(today);
    edit_card(db.conn(), archived).unwrap();

    let revived_day = today.add_days(40);
    let revived = api::revive_card(db.conn(), card.id, revived_day).unwrap();
    assert_eq!(revived.current_stage, Stage::Day0);
    assert_eq!(revived.start_date, revived_day);
    assert!(!revived.archived);
    assert_eq!(revived.last_completed_at, None);

    // A `revived` event was recorded.
    let revived_events = api::list_history(db.conn(), HistoryFilter::all())
        .unwrap()
        .into_iter()
        .filter(|e| e.kind == "revived")
        .count();
    assert_eq!(revived_events, 1);
}

// ---- edit / delete ----

#[test]
fn edit_card_persists_changes_and_validates_title() {
    let db = db();
    let today = ymd(2026, 5, 1);
    let card = create_card(db.conn(), new_spaced("Original"), today).unwrap();

    let mut edited = card.clone();
    edited.title = "Editado".to_string();
    edited.technique = Some(Technique::Feynman);
    edited.est_minutes = Some(20);
    let saved = edit_card(db.conn(), edited).unwrap();
    assert_eq!(saved.title, "Editado");

    let board = api::list_board(db.conn(), Method::SpacedRepetition, today).unwrap();
    assert_eq!(board.len(), 1);
    assert_eq!(board[0].title, "Editado");
    assert_eq!(board[0].technique, Some(Technique::Feynman));
    assert_eq!(board[0].est_minutes, Some(20));

    // Editing to an empty title is rejected.
    let mut bad = saved.clone();
    bad.title = "  ".to_string();
    assert_eq!(edit_card(db.conn(), bad).unwrap_err(), ApiError::EmptyTitle);
}

#[test]
fn delete_card_removes_it_from_the_board() {
    let db = db();
    let today = ymd(2026, 5, 1);
    let card = create_card(db.conn(), new_spaced("Excluir"), today).unwrap();
    assert_eq!(
        api::list_board(db.conn(), Method::SpacedRepetition, today)
            .unwrap()
            .len(),
        1
    );

    delete_card(db.conn(), card.id).unwrap();
    assert_eq!(
        api::list_board(db.conn(), Method::SpacedRepetition, today)
            .unwrap()
            .len(),
        0
    );
}

#[test]
fn complete_card_missing_id_is_a_typed_error() {
    let db = db();
    assert_eq!(
        api::complete_card(db.conn(), 999, ymd(2026, 5, 1)).unwrap_err(),
        ApiError::CardNotFound(999)
    );
}

// ---- exams ----

#[test]
fn create_exam_happy_path_and_date_bounds() {
    let db = db();
    let today = ymd(2026, 5, 1);

    let exam = create_exam(
        db.conn(),
        "Cálculo I".to_string(),
        today.add_days(30),
        today,
    )
    .unwrap();
    assert!(exam.id > 0);
    assert_eq!(exam.exam_date, today.add_days(30));
    assert!(!exam.concluded);

    // A past date is rejected.
    assert_eq!(
        create_exam(db.conn(), "Ontem".to_string(), today.add_days(-1), today).unwrap_err(),
        ApiError::ExamDateInPast
    );

    // Today itself is accepted (edge case: exam today → one session today, downstream).
    assert!(create_exam(db.conn(), "Hoje".to_string(), today, today).is_ok());

    // An empty name is rejected.
    assert_eq!(
        create_exam(db.conn(), "  ".to_string(), today.add_days(5), today).unwrap_err(),
        ApiError::EmptyExamName
    );
}

#[test]
fn create_exam_rejects_dates_more_than_five_years_out() {
    let db = db();
    let today = ymd(2026, 5, 1);
    // Just over five years is rejected; exactly five years is accepted.
    let five_years = ymd(2031, 5, 1);
    assert!(create_exam(db.conn(), "5 anos".to_string(), five_years, today).is_ok());

    let too_far = ymd(2031, 5, 2);
    assert!(matches!(
        create_exam(db.conn(), "Longe".to_string(), too_far, today).unwrap_err(),
        ApiError::ExamDateTooFar { .. }
    ));
}

#[test]
fn create_exam_card_materializes_its_session_schedule() {
    let db = db();
    let today = ymd(2026, 5, 1);
    let exam = create_exam(db.conn(), "Prova".to_string(), today.add_days(30), today).unwrap();

    let mut card = new_spaced("Conteúdo");
    card.method = Method::ExamPrep;
    card.exam_id = Some(exam.id);
    let card = create_card(db.conn(), card, today).unwrap();

    // S=30 → exactly 5 sessions at offsets [0,13,20,25,30] (EXAM-03).
    let sessions = load_sessions(db.conn(), card.id).unwrap();
    let offsets: Vec<i64> = sessions
        .iter()
        .map(|s| today.days_until(s.due_date))
        .collect();
    assert_eq!(offsets, vec![0, 13, 20, 25, 30]);
    assert!(sessions.iter().all(|s| s.completed_at.is_none()));
}

#[test]
fn create_exam_card_with_unknown_exam_is_rejected() {
    let db = db();
    let today = ymd(2026, 5, 1);
    let mut card = new_spaced("Órfã");
    card.method = Method::ExamPrep;
    card.exam_id = Some(4242);
    assert_eq!(
        create_card(db.conn(), card, today).unwrap_err(),
        ApiError::ExamNotFound(4242)
    );
}

#[test]
fn completing_exam_sessions_advances_then_archives() {
    let db = db();
    let today = ymd(2026, 5, 1);
    let exam = create_exam(db.conn(), "Prova".to_string(), today.add_days(1), today).unwrap();
    // S=1 → 2 sessions (offsets 0 and 1).
    let mut card = new_spaced("Conteúdo");
    card.method = Method::ExamPrep;
    card.exam_id = Some(exam.id);
    let card = create_card(db.conn(), card, today).unwrap();
    assert_eq!(load_sessions(db.conn(), card.id).unwrap().len(), 2);

    // Complete the first session — not yet archived.
    let after1 = api::complete_card(db.conn(), card.id, today).unwrap();
    assert!(!after1.archived);
    let sessions = load_sessions(db.conn(), card.id).unwrap();
    assert_eq!(sessions[0].completed_at, Some(today));

    // Complete the last session — card archived.
    let after2 = api::complete_card(db.conn(), card.id, today.add_days(1)).unwrap();
    assert!(after2.archived);
}

#[test]
fn postpone_exam_card_shifts_only_the_cursor_session() {
    let db = db();
    let today = ymd(2026, 5, 1);
    let exam = create_exam(db.conn(), "Prova".to_string(), today.add_days(30), today).unwrap();
    let mut card = new_spaced("Conteúdo");
    card.method = Method::ExamPrep;
    card.exam_id = Some(exam.id);
    let card = create_card(db.conn(), card, today).unwrap();

    let before = load_sessions(db.conn(), card.id).unwrap();
    api::postpone_card(db.conn(), card.id, 2, today).unwrap();
    let after = load_sessions(db.conn(), card.id).unwrap();

    // Only the cursor (seq 0) moved by +2; later sessions are untouched.
    assert_eq!(after[0].due_date, before[0].due_date.add_days(2));
    assert_eq!(after[1].due_date, before[1].due_date);
    assert_eq!(after[2].due_date, before[2].due_date);
}

#[test]
fn delete_exam_cascades_to_its_cards_and_sessions() {
    let db = db();
    let today = ymd(2026, 5, 1);
    let exam = create_exam(db.conn(), "Prova".to_string(), today.add_days(10), today).unwrap();
    let mut card = new_spaced("Conteúdo");
    card.method = Method::ExamPrep;
    card.exam_id = Some(exam.id);
    let card = create_card(db.conn(), card, today).unwrap();
    assert!(!load_sessions(db.conn(), card.id).unwrap().is_empty());

    delete_exam(db.conn(), exam.id).unwrap();

    assert_eq!(
        api::list_board(db.conn(), Method::ExamPrep, today)
            .unwrap()
            .len(),
        0
    );
    assert!(load_sessions(db.conn(), card.id).unwrap().is_empty());
}

// ---- list_exams read projection (T30, EXAM-01.6 / EXAM-04) ----

#[test]
fn list_exams_on_empty_db_returns_no_exams() {
    let db = db();
    let today = ymd(2026, 5, 1);
    assert!(api::list_exams(db.conn(), today).unwrap().is_empty());
}

#[test]
fn list_exams_reports_days_remaining_and_session_progress() {
    let db = db();
    let today = ymd(2026, 5, 1);

    // An exam 30 days out with one card → 5 materialized sessions ([0,13,20,25,30]).
    let exam = create_exam(db.conn(), "Cálculo".to_string(), today.add_days(30), today).unwrap();
    let mut card = new_spaced("Integrais");
    card.method = Method::ExamPrep;
    card.exam_id = Some(exam.id);
    let card = create_card(db.conn(), card, today).unwrap();
    assert_eq!(load_sessions(db.conn(), card.id).unwrap().len(), 5);

    // Before any completion: 0/5 done, 30 days remaining, name + date carried through.
    let views = api::list_exams(db.conn(), today).unwrap();
    assert_eq!(views.len(), 1);
    let v = &views[0];
    assert_eq!(v.id, exam.id);
    assert_eq!(v.name, "Cálculo");
    assert_eq!(v.exam_date, today.add_days(30));
    assert_eq!(v.days_remaining, 30);
    assert_eq!(v.completed_sessions, 0);
    assert_eq!(v.total_sessions, 5);
    assert!(!v.concluded);

    // Completing one session bumps the completed count to 1 of 5.
    api::complete_card(db.conn(), card.id, today).unwrap();
    let after = api::list_exams(db.conn(), today).unwrap();
    assert_eq!(after[0].completed_sessions, 1);
    assert_eq!(after[0].total_sessions, 5);
}

#[test]
fn list_exams_orders_by_soonest_target_date() {
    let db = db();
    let today = ymd(2026, 5, 1);
    // Created out of order; the read must return the sooner exam first.
    create_exam(db.conn(), "Depois".to_string(), today.add_days(40), today).unwrap();
    create_exam(db.conn(), "Antes".to_string(), today.add_days(5), today).unwrap();

    let views = api::list_exams(db.conn(), today).unwrap();
    assert_eq!(views.len(), 2);
    assert_eq!(views[0].name, "Antes");
    assert_eq!(views[0].days_remaining, 5);
    assert_eq!(views[1].name, "Depois");
    assert_eq!(views[1].days_remaining, 40);
}

// ---- history scope + session recording ----

#[test]
fn history_is_scoped_per_method_and_unified() {
    let db = db();
    let today = ymd(2026, 5, 1);

    // One spaced card completed.
    let spaced = create_card(db.conn(), new_spaced("Espaçada"), today).unwrap();
    api::complete_card(db.conn(), spaced.id, today).unwrap();

    // One exam card completed (single-session exam today).
    let exam = create_exam(db.conn(), "Prova".to_string(), today, today).unwrap();
    let mut ec = new_spaced("ProvaCard");
    ec.method = Method::ExamPrep;
    ec.exam_id = Some(exam.id);
    let ec = create_card(db.conn(), ec, today).unwrap();
    api::complete_card(db.conn(), ec.id, today).unwrap();

    let spaced_completed = api::list_history(
        db.conn(),
        HistoryFilter::for_method(Method::SpacedRepetition),
    )
    .unwrap()
    .into_iter()
    .filter(|e| e.kind == "completed")
    .count();
    assert_eq!(spaced_completed, 1);

    let exam_completed = api::list_history(db.conn(), HistoryFilter::for_method(Method::ExamPrep))
        .unwrap()
        .into_iter()
        .filter(|e| e.kind == "completed")
        .count();
    assert_eq!(exam_completed, 1);

    // The unified view sees both completions.
    let all_completed = api::list_history(db.conn(), HistoryFilter::all())
        .unwrap()
        .into_iter()
        .filter(|e| e.kind == "completed")
        .count();
    assert_eq!(all_completed, 2);
}

#[test]
fn record_session_persists_focused_seconds_on_the_event() {
    let db = db();
    let today = ymd(2026, 5, 1);
    let mut card = new_spaced("Pomodoro");
    card.technique = Some(Technique::Pomodoro);
    card.est_minutes = Some(25);
    card.pomodoro = Some(PomodoroRhythm::CLASSIC);
    let card = create_card(db.conn(), card, today).unwrap();

    let done = api::record_session(db.conn(), card.id, 1500, Some(2), today).unwrap();
    assert_eq!(
        done.current_stage,
        Stage::Day1,
        "session completion advances the card"
    );

    let ev = api::list_history(db.conn(), HistoryFilter::all())
        .unwrap()
        .into_iter()
        .find(|e| e.kind == "completed")
        .expect("a completed event exists");
    assert_eq!(ev.focused_secs, Some(1500));
    assert_eq!(ev.self_rating, Some(2));
    assert_eq!(ev.technique, Some(Technique::Pomodoro));
}

// ---- T38: auto-conclusion of lapsed exams (EXAM-01 AC#5) ----

/// Create an exam `span` days out with one exam card materializing its sessions; returns
/// `(exam_id, card_id)`.
fn exam_with_card(db: &Db, name: &str, today: Date, span: i64) -> (i64, i64) {
    let exam = create_exam(db.conn(), name.to_string(), today.add_days(span), today).unwrap();
    let mut card = new_spaced("Conteúdo");
    card.method = Method::ExamPrep;
    card.exam_id = Some(exam.id);
    let card = create_card(db.conn(), card, today).unwrap();
    (exam.id, card.id)
}

/// Count archived history events for a specific card.
fn archived_events_for(db: &Db, card_id: i64) -> usize {
    api::list_history(db.conn(), HistoryFilter::all())
        .unwrap()
        .into_iter()
        .filter(|e| e.kind == "archived" && e.card_id == card_id)
        .count()
}

/// Read the stored `concluded` flag for an exam directly from the row (payload assertion).
fn is_concluded(db: &Db, exam_id: i64) -> bool {
    load_exams(db.conn())
        .unwrap()
        .into_iter()
        .find(|e| e.id == exam_id)
        .expect("exam exists")
        .concluded
}

#[test]
fn lapsed_exam_is_concluded_cards_archived_and_history_recorded() {
    let db = db();
    let today = ymd(2026, 5, 1);
    // Exam 5 days out (S=5 → 3 sessions, all pending), created legitimately in the future.
    let (exam_id, card_id) = exam_with_card(&db, "Cálculo", today, 5);
    // Time passes: the day after the exam date.
    let after = today.add_days(6);

    let concluded = api::conclude_lapsed_exams(db.conn(), after).unwrap();
    assert_eq!(concluded, 1, "the single lapsed exam is concluded");

    // AC#5 part 1 — the exam row is marked concluded (stored value).
    assert!(is_concluded(&db, exam_id), "exam row concluded = 1");

    // AC#5 part 2 — its still-pending card is archived (stored value).
    let card = load_card(db.conn(), card_id).unwrap().expect("card exists");
    assert!(card.archived, "remaining card archived = 1");

    // AC#5 part 3 — the outcome is recorded in history (an archived event for the card).
    let ev = api::list_history(db.conn(), HistoryFilter::all())
        .unwrap()
        .into_iter()
        .find(|e| e.kind == "archived" && e.card_id == card_id)
        .expect("an archived history event exists for the card");
    assert_eq!(ev.method, Method::ExamPrep, "event labeled with the method");
    assert_eq!(ev.when, after, "event dated at the sweep day");
    assert_eq!(
        archived_events_for(&db, card_id),
        1,
        "exactly one archived event"
    );

    // Idempotency — a second sweep concludes nothing and records no further events.
    let again = api::conclude_lapsed_exams(db.conn(), after).unwrap();
    assert_eq!(again, 0, "second run is a no-op");
    assert!(is_concluded(&db, exam_id));
    assert_eq!(
        archived_events_for(&db, card_id),
        1,
        "no duplicate archived event"
    );
}

#[test]
fn not_yet_lapsed_exam_is_left_untouched() {
    let db = db();
    let today = ymd(2026, 5, 1);
    let (exam_id, card_id) = exam_with_card(&db, "Física", today, 30);

    // On the exam date itself the final session is still due → not concluded (should_conclude).
    let on_date = today.add_days(30);
    assert_eq!(api::conclude_lapsed_exams(db.conn(), on_date).unwrap(), 0);
    // And well before the date.
    assert_eq!(api::conclude_lapsed_exams(db.conn(), today).unwrap(), 0);

    assert!(!is_concluded(&db, exam_id), "exam stays not concluded");
    let card = load_card(db.conn(), card_id).unwrap().expect("card exists");
    assert!(!card.archived, "card stays active");
    assert_eq!(
        archived_events_for(&db, card_id),
        0,
        "no archived event recorded"
    );
}

#[test]
fn list_exams_read_path_sweeps_lapsed_exams() {
    let db = db();
    let today = ymd(2026, 5, 1);
    let (exam_id, card_id) = exam_with_card(&db, "Química", today, 3);
    let after = today.add_days(4);

    // Calling the read path alone (no direct conclude call) must reflect the conclusion.
    let views = api::list_exams(db.conn(), after).unwrap();
    let view = views.into_iter().find(|v| v.id == exam_id).unwrap();
    assert!(view.concluded, "list_exams reports the exam concluded");

    // The card was archived by the sweep (stored value + drops off the active board).
    let card = load_card(db.conn(), card_id).unwrap().expect("card exists");
    assert!(card.archived);
    assert_eq!(archived_events_for(&db, card_id), 1);
}

#[test]
fn list_board_read_path_sweeps_lapsed_exam_cards() {
    let db = db();
    let today = ymd(2026, 5, 1);
    let (_exam_id, card_id) = exam_with_card(&db, "Biologia", today, 3);
    let after = today.add_days(4);

    // The ExamPrep board read sweeps first, so the lapsed card is archived and excluded.
    let board = api::list_board(db.conn(), Method::ExamPrep, after).unwrap();
    assert!(
        board.iter().all(|c| c.id != card_id),
        "lapsed card no longer on the active board"
    );
    let card = load_card(db.conn(), card_id).unwrap().expect("card exists");
    assert!(card.archived, "board read archived the lapsed card");
}

// ---- written attempts (T44, TECH-04.4 / AD-011) ----

#[test]
fn record_attempt_persists_and_lists_newest_first() {
    let db = db();
    let today = ymd(2026, 5, 1);
    let card = create_card(db.conn(), new_spaced("Mitose"), today).unwrap();

    let first = api::record_attempt(
        db.conn(),
        card.id,
        AttemptKind::ActiveRecall,
        "o que eu lembro".to_string(),
        today,
    )
    .unwrap();
    assert!(first.id > 0);
    assert_eq!(first.kind, AttemptKind::ActiveRecall);
    assert_eq!(first.created_at, today);

    let later = today.add_days(1);
    api::record_attempt(
        db.conn(),
        card.id,
        AttemptKind::Feynman,
        "explicação".to_string(),
        later,
    )
    .unwrap();

    let attempts = api::list_attempts(db.conn(), card.id).unwrap();
    assert_eq!(attempts.len(), 2);
    // Newest first (TECH-04.4).
    assert_eq!(attempts[0].text, "explicação");
    assert_eq!(attempts[0].kind, AttemptKind::Feynman);
    assert_eq!(attempts[1].text, "o que eu lembro");
}

#[test]
fn record_attempt_rejects_empty_text() {
    let db = db();
    let today = ymd(2026, 5, 1);
    let card = create_card(db.conn(), new_spaced("Meiose"), today).unwrap();

    let err = api::record_attempt(
        db.conn(),
        card.id,
        AttemptKind::Feynman,
        "   ".to_string(),
        today,
    )
    .unwrap_err();
    assert_eq!(err, ApiError::EmptyAttemptText);
    // Nothing was persisted.
    assert_eq!(api::list_attempts(db.conn(), card.id).unwrap().len(), 0);
}

#[test]
fn record_attempt_on_a_missing_card_is_card_not_found() {
    let db = db();
    let err = api::record_attempt(
        db.conn(),
        999,
        AttemptKind::ActiveRecall,
        "texto".to_string(),
        ymd(2026, 5, 1),
    )
    .unwrap_err();
    assert_eq!(err, ApiError::CardNotFound(999));
}
