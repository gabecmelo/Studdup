//! T13 — history events: full-payload persistence, per-method vs unified scope, technique filter.

mod common;

use common::{sample_card, ymd, TempDb};
use studdup_core::domain::{HistoryEvent, Method, Stage, Technique};
use studdup_core::repository::cards::insert_card;
use studdup_core::repository::events::{load_history, record_event, HistoryFilter};
use studdup_core::repository::Db;

fn fresh_db() -> (TempDb, Db) {
    let temp = TempDb::new();
    let db = Db::open(&temp.path).unwrap();
    db.create_schema().unwrap();
    (temp, db)
}

/// Insert a card of `method` and return its id (events need a real FK target).
fn insert_card_of(db: &Db, title: &str, method: Method) -> i64 {
    let mut card = sample_card(title);
    card.method = method;
    insert_card(db.conn(), &card).unwrap()
}

fn event(card_id: i64, method: Method) -> HistoryEvent {
    HistoryEvent {
        id: 0,
        card_id,
        kind: "completed".to_string(),
        from_stage: Stage::Day2,
        to_stage: Stage::Day5,
        method,
        technique: None,
        focused_secs: None,
        self_rating: None,
        when: ymd(2026, 5, 1),
    }
}

#[test]
fn event_payload_persists_all_new_fields() {
    let (_temp, db) = fresh_db();
    let card_id = insert_card_of(&db, "Integrais", Method::ExamPrep);

    let mut ev = event(card_id, Method::ExamPrep);
    ev.technique = Some(Technique::ActiveRecall);
    ev.focused_secs = Some(1500);
    ev.self_rating = Some(2);
    let id = record_event(db.conn(), &ev).unwrap();
    assert!(id > 0);

    let loaded = load_history(db.conn(), &HistoryFilter::all()).unwrap();
    assert_eq!(loaded.len(), 1);

    let mut expected = ev.clone();
    expected.id = id;
    // Full equality proves the whole payload (method/technique/focused_secs/self_rating,
    // stage transition and date) round-tripped.
    assert_eq!(loaded[0], expected);
    assert_eq!(loaded[0].method, Method::ExamPrep);
    assert_eq!(loaded[0].technique, Some(Technique::ActiveRecall));
    assert_eq!(loaded[0].focused_secs, Some(1500));
    assert_eq!(loaded[0].self_rating, Some(2));
    assert_eq!(loaded[0].from_stage, Stage::Day2);
    assert_eq!(loaded[0].to_stage, Stage::Day5);
}

#[test]
fn per_method_scope_versus_unified_returns_correct_sets() {
    let (_temp, db) = fresh_db();
    let spaced_card = insert_card_of(&db, "Espaçada", Method::SpacedRepetition);
    let exam_card = insert_card_of(&db, "Prova", Method::ExamPrep);

    record_event(db.conn(), &event(spaced_card, Method::SpacedRepetition)).unwrap();
    record_event(db.conn(), &event(exam_card, Method::ExamPrep)).unwrap();
    record_event(db.conn(), &event(exam_card, Method::ExamPrep)).unwrap();

    // Per-method (HIST-01): only that method's events.
    let spaced = load_history(db.conn(), &HistoryFilter::for_method(Method::SpacedRepetition)).unwrap();
    assert_eq!(spaced.len(), 1);
    assert!(spaced.iter().all(|e| e.method == Method::SpacedRepetition));

    let exam = load_history(db.conn(), &HistoryFilter::for_method(Method::ExamPrep)).unwrap();
    assert_eq!(exam.len(), 2);
    assert!(exam.iter().all(|e| e.method == Method::ExamPrep));

    // Unified (HIST-02): everything, labeled by method.
    let all = load_history(db.conn(), &HistoryFilter::all()).unwrap();
    assert_eq!(all.len(), 3);
    assert_eq!(all.iter().filter(|e| e.method == Method::SpacedRepetition).count(), 1);
    assert_eq!(all.iter().filter(|e| e.method == Method::ExamPrep).count(), 2);
}

#[test]
fn technique_filter_narrows_and_counts_correctly() {
    let (_temp, db) = fresh_db();
    let card = insert_card_of(&db, "Card", Method::SpacedRepetition);

    let with = |t: Option<Technique>| {
        let mut e = event(card, Method::SpacedRepetition);
        e.technique = t;
        e
    };
    record_event(db.conn(), &with(Some(Technique::Pomodoro))).unwrap();
    record_event(db.conn(), &with(Some(Technique::Pomodoro))).unwrap();
    record_event(db.conn(), &with(Some(Technique::Feynman))).unwrap();
    record_event(db.conn(), &with(None)).unwrap();

    // Filter by technique (HIST-03): count matches only matching events.
    let pomodoro = load_history(
        db.conn(),
        &HistoryFilter::all().with_technique(Technique::Pomodoro),
    )
    .unwrap();
    assert_eq!(pomodoro.len(), 2);
    assert!(pomodoro.iter().all(|e| e.technique == Some(Technique::Pomodoro)));

    let feynman = load_history(
        db.conn(),
        &HistoryFilter::all().with_technique(Technique::Feynman),
    )
    .unwrap();
    assert_eq!(feynman.len(), 1);

    // Unified still sees all four.
    assert_eq!(load_history(db.conn(), &HistoryFilter::all()).unwrap().len(), 4);
}

#[test]
fn method_and_technique_filters_compose() {
    let (_temp, db) = fresh_db();
    let spaced = insert_card_of(&db, "S", Method::SpacedRepetition);
    let exam = insert_card_of(&db, "E", Method::ExamPrep);

    let mk = |card: i64, m: Method, t: Technique| {
        let mut e = event(card, m);
        e.technique = Some(t);
        e
    };
    record_event(db.conn(), &mk(spaced, Method::SpacedRepetition, Technique::Pomodoro)).unwrap();
    record_event(db.conn(), &mk(exam, Method::ExamPrep, Technique::Pomodoro)).unwrap();

    let filter = HistoryFilter::for_method(Method::ExamPrep).with_technique(Technique::Pomodoro);
    let got = load_history(db.conn(), &filter).unwrap();
    assert_eq!(got.len(), 1);
    assert_eq!(got[0].method, Method::ExamPrep);
    assert_eq!(got[0].technique, Some(Technique::Pomodoro));
}
