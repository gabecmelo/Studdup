//! T11 — card repository: field-preserving round-trip, method-scoped loads, cascade delete.

mod common;

use common::{sample_card, ymd, TempDb};
use studdup_core::domain::{Method, PomodoroRhythm, Stage, Technique};
use studdup_core::repository::cards::{
    delete_card, insert_card, load_active, load_archived, update_card,
};
use studdup_core::repository::Db;

fn fresh_db() -> (TempDb, Db) {
    let temp = TempDb::new();
    let db = Db::open(&temp.path).unwrap();
    db.create_schema().unwrap();
    (temp, db)
}

#[test]
fn insert_then_load_preserves_every_field() {
    let (_temp, db) = fresh_db();

    // A fully-populated card: technique, estimate, Pomodoro rhythm, a prior completion.
    let mut card = sample_card("Integrais");
    card.content_link = "https://example.com/a".to_string();
    card.review_link = "https://example.com/b".to_string();
    card.technique = Some(Technique::Pomodoro);
    card.est_minutes = Some(50);
    card.pomodoro = Some(PomodoroRhythm::LONG); // 50/10
    card.start_date = ymd(2026, 4, 20);
    card.current_stage = Stage::Day5;
    card.created_at = ymd(2026, 4, 1);
    card.last_completed_at = Some(ymd(2026, 4, 25));

    let id = insert_card(db.conn(), &card).unwrap();
    assert!(id > 0);

    let loaded = load_active(db.conn(), Method::SpacedRepetition).unwrap();
    assert_eq!(loaded.len(), 1);

    let mut expected = card.clone();
    expected.id = id;
    // Full equality proves every column (incl. the new ones) round-tripped exactly.
    assert_eq!(loaded[0], expected);
    // Spot-check the new columns explicitly.
    assert_eq!(loaded[0].technique, Some(Technique::Pomodoro));
    assert_eq!(loaded[0].est_minutes, Some(50));
    assert_eq!(
        loaded[0].pomodoro,
        Some(PomodoroRhythm {
            focus_min: 50,
            break_min: 10,
            cycles: 4
        })
    );
    assert_eq!(loaded[0].current_stage, Stage::Day5);
}

#[test]
fn a_card_with_no_technique_round_trips_with_nulls() {
    let (_temp, db) = fresh_db();
    let card = sample_card("Sem técnica"); // technique/est/pomodoro all None
    let id = insert_card(db.conn(), &card).unwrap();

    let loaded = load_active(db.conn(), Method::SpacedRepetition).unwrap();
    assert_eq!(loaded.len(), 1);
    assert_eq!(loaded[0].id, id);
    assert_eq!(loaded[0].technique, None);
    assert_eq!(loaded[0].est_minutes, None);
    assert_eq!(loaded[0].pomodoro, None);
    assert_eq!(loaded[0].last_completed_at, None);
    assert_eq!(loaded[0].exam_id, None);
}

#[test]
fn a_pomodoro_card_round_trips_its_cycle_count() {
    let (_temp, db) = fresh_db();
    let mut card = sample_card("Ciclos");
    card.technique = Some(Technique::Pomodoro);
    card.est_minutes = Some(100);
    card.pomodoro = Some(PomodoroRhythm {
        focus_min: 25,
        break_min: 5,
        cycles: 6,
    });
    insert_card(db.conn(), &card).unwrap();

    let loaded = load_active(db.conn(), Method::SpacedRepetition).unwrap();
    assert_eq!(loaded[0].pomodoro.unwrap().cycles, 6);
}

/// A v2-migrated Pomodoro card has focus/break set but a NULL `pomodoro_cycles`; it must read back
/// as the default of 4 cycles (schema v3 back-compat).
#[test]
fn a_pomodoro_card_with_null_cycles_defaults_to_four() {
    let (_temp, db) = fresh_db();
    db.conn()
        .execute(
            "INSERT INTO cards \
             (title, start_date, stage, created_at, method, technique, est_minutes, \
              pomodoro_focus_min, pomodoro_break_min, pomodoro_cycles) \
             VALUES ('Migrada', '2026-04-29', 0, '2026-04-29', 'spaced', 'pomodoro', 25, 25, 5, NULL)",
            [],
        )
        .unwrap();

    let loaded = load_active(db.conn(), Method::SpacedRepetition).unwrap();
    assert_eq!(loaded.len(), 1);
    let pomodoro = loaded[0].pomodoro.unwrap();
    assert_eq!(pomodoro.focus_min, 25);
    assert_eq!(pomodoro.break_min, 5);
    assert_eq!(pomodoro.cycles, 4);
}

#[test]
fn load_active_is_scoped_to_its_method() {
    let (_temp, db) = fresh_db();

    let spaced = sample_card("Espaçada");
    let mut exam = sample_card("Prova");
    exam.method = Method::ExamPrep;

    insert_card(db.conn(), &spaced).unwrap();
    insert_card(db.conn(), &exam).unwrap();

    let active_spaced = load_active(db.conn(), Method::SpacedRepetition).unwrap();
    assert_eq!(active_spaced.len(), 1);
    assert_eq!(active_spaced[0].title, "Espaçada");
    assert_eq!(active_spaced[0].method, Method::SpacedRepetition);

    let active_exam = load_active(db.conn(), Method::ExamPrep).unwrap();
    assert_eq!(active_exam.len(), 1);
    assert_eq!(active_exam[0].title, "Prova");
    assert_eq!(active_exam[0].method, Method::ExamPrep);
}

#[test]
fn archived_cards_load_separately_from_active() {
    let (_temp, db) = fresh_db();

    let active = sample_card("Ativa");
    let mut done = sample_card("Arquivada");
    done.archived = true;
    done.last_completed_at = Some(ymd(2026, 5, 1));

    insert_card(db.conn(), &active).unwrap();
    insert_card(db.conn(), &done).unwrap();

    let active_list = load_active(db.conn(), Method::SpacedRepetition).unwrap();
    assert_eq!(active_list.len(), 1);
    assert_eq!(active_list[0].title, "Ativa");

    let archived_list = load_archived(db.conn(), Method::SpacedRepetition).unwrap();
    assert_eq!(archived_list.len(), 1);
    assert_eq!(archived_list[0].title, "Arquivada");
    assert!(archived_list[0].archived);
}

#[test]
fn update_card_persists_changes() {
    let (_temp, db) = fresh_db();
    let card = sample_card("Antes");
    let id = insert_card(db.conn(), &card).unwrap();

    let mut edited = load_active(db.conn(), Method::SpacedRepetition)
        .unwrap()
        .remove(0);
    edited.title = "Depois".to_string();
    edited.current_stage = Stage::Day15;
    edited.technique = Some(Technique::Feynman);
    edited.est_minutes = Some(20);
    update_card(db.conn(), &edited).unwrap();

    let reloaded = load_active(db.conn(), Method::SpacedRepetition).unwrap();
    assert_eq!(reloaded.len(), 1);
    assert_eq!(reloaded[0].id, id);
    assert_eq!(reloaded[0].title, "Depois");
    assert_eq!(reloaded[0].current_stage, Stage::Day15);
    assert_eq!(reloaded[0].technique, Some(Technique::Feynman));
    assert_eq!(reloaded[0].est_minutes, Some(20));
}

#[test]
fn delete_card_cascades_to_children() {
    let (_temp, db) = fresh_db();
    let card = sample_card("Com filhos");
    let id = insert_card(db.conn(), &card).unwrap();

    // Insert child rows in the FK-referencing tables directly (repositories land in T12/T13).
    db.conn()
        .execute(
            "INSERT INTO history (card_id, event_type, from_stage, to_stage, when_date, method) \
             VALUES (?1, 'completed', 0, 1, '2026-05-01', 'spaced')",
            [id],
        )
        .unwrap();
    db.conn()
        .execute(
            "INSERT INTO exam_sessions (card_id, seq, due_date) VALUES (?1, 0, '2026-05-01')",
            [id],
        )
        .unwrap();
    db.conn()
        .execute(
            "INSERT INTO leitner_items (card_id, front, back, box_no, due_date) \
             VALUES (?1, 'f', 'b', 1, '2026-05-01')",
            [id],
        )
        .unwrap();

    delete_card(db.conn(), id).unwrap();

    // The card and all its children are gone.
    let card_count: i64 = db
        .conn()
        .query_row("SELECT count(*) FROM cards WHERE id = ?1", [id], |r| {
            r.get(0)
        })
        .unwrap();
    assert_eq!(card_count, 0);

    for table in ["history", "exam_sessions", "leitner_items"] {
        let child_count: i64 = db
            .conn()
            .query_row(
                &format!("SELECT count(*) FROM {table} WHERE card_id = ?1"),
                [id],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(child_count, 0, "cascade left orphan rows in {table}");
    }
}
