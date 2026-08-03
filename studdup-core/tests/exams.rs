//! T12 — exam & session repository: round-trip, cascade delete, progress query, advance.

mod common;

use common::{sample_card, ymd, TempDb};
use studdup_core::domain::{Exam, Method};
use studdup_core::repository::cards::insert_card;
use studdup_core::repository::exams::{
    advance_session, delete_exam_cascade, exam_session_progress, insert_exam, insert_sessions,
    load_exams, load_sessions, session_cursors,
};
use studdup_core::repository::Db;

fn fresh_db() -> (TempDb, Db) {
    let temp = TempDb::new();
    let db = Db::open(&temp.path).unwrap();
    db.create_schema().unwrap();
    (temp, db)
}

fn sample_exam(name: &str, exam_date: (i32, u8, u8)) -> Exam {
    Exam {
        id: 0,
        name: name.to_string(),
        exam_date: ymd(exam_date.0, exam_date.1, exam_date.2),
        created_at: ymd(2026, 5, 1),
        concluded: false,
    }
}

/// Insert an exam card bound to `exam_id`; return its card id.
fn insert_exam_card(db: &Db, title: &str, exam_id: i64) -> i64 {
    let mut card = sample_card(title);
    card.method = Method::ExamPrep;
    card.exam_id = Some(exam_id);
    insert_card(db.conn(), &card).unwrap()
}

#[test]
fn exam_and_sessions_round_trip() {
    let (_temp, db) = fresh_db();

    let exam_id = insert_exam(db.conn(), &sample_exam("Cálculo I", (2026, 6, 1))).unwrap();
    assert!(exam_id > 0);

    let card_id = insert_exam_card(&db, "Limites", exam_id);
    let dates = [ymd(2026, 5, 1), ymd(2026, 5, 6), ymd(2026, 5, 11)];
    insert_sessions(db.conn(), card_id, &dates).unwrap();

    // Exam fields survive the round-trip.
    let exams = load_exams(db.conn()).unwrap();
    assert_eq!(exams.len(), 1);
    let mut expected = sample_exam("Cálculo I", (2026, 6, 1));
    expected.id = exam_id;
    assert_eq!(exams[0], expected);

    // Sessions materialized with contiguous seq and the exact dates, all uncompleted.
    let sessions = load_sessions(db.conn(), card_id).unwrap();
    assert_eq!(sessions.len(), 3);
    for (i, s) in sessions.iter().enumerate() {
        assert_eq!(s.seq as usize, i);
        assert_eq!(s.card_id, card_id);
        assert_eq!(s.due_date, dates[i]);
        assert_eq!(s.completed_at, None);
    }
}

#[test]
fn delete_exam_removes_its_cards_and_sessions() {
    let (_temp, db) = fresh_db();

    let exam_id = insert_exam(db.conn(), &sample_exam("Física", (2026, 6, 10))).unwrap();
    let card_id = insert_exam_card(&db, "Cinemática", exam_id);
    insert_sessions(db.conn(), card_id, &[ymd(2026, 5, 1), ymd(2026, 5, 8)]).unwrap();

    // A second, unrelated exam must remain untouched.
    let other_exam = insert_exam(db.conn(), &sample_exam("Química", (2026, 7, 1))).unwrap();
    let other_card = insert_exam_card(&db, "Estequiometria", other_exam);
    insert_sessions(db.conn(), other_card, &[ymd(2026, 6, 1)]).unwrap();

    delete_exam_cascade(db.conn(), exam_id).unwrap();

    // Deleted exam, its card and its sessions are all gone.
    assert!(load_exams(db.conn())
        .unwrap()
        .iter()
        .all(|e| e.id != exam_id));
    let cards_left: i64 = db
        .conn()
        .query_row(
            "SELECT count(*) FROM cards WHERE exam_id = ?1",
            [exam_id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(cards_left, 0);
    assert_eq!(load_sessions(db.conn(), card_id).unwrap().len(), 0);

    // The unrelated exam and its card/sessions survive.
    assert!(load_exams(db.conn())
        .unwrap()
        .iter()
        .any(|e| e.id == other_exam));
    assert_eq!(load_sessions(db.conn(), other_card).unwrap().len(), 1);
}

#[test]
fn progress_counts_completed_versus_total_across_all_cards() {
    let (_temp, db) = fresh_db();

    let exam_id = insert_exam(db.conn(), &sample_exam("Biologia", (2026, 6, 20))).unwrap();
    let card_a = insert_exam_card(&db, "Célula", exam_id);
    let card_b = insert_exam_card(&db, "Genética", exam_id);
    insert_sessions(db.conn(), card_a, &[ymd(2026, 5, 1), ymd(2026, 5, 6)]).unwrap();
    insert_sessions(
        db.conn(),
        card_b,
        &[ymd(2026, 5, 2), ymd(2026, 5, 7), ymd(2026, 5, 12)],
    )
    .unwrap();

    // Start: 0 of 5 completed.
    assert_eq!(exam_session_progress(db.conn(), exam_id).unwrap(), (0, 5));

    // Complete the first session of card A and the first two of card B → 3 of 5.
    let a_sessions = load_sessions(db.conn(), card_a).unwrap();
    advance_session(db.conn(), a_sessions[0].id, ymd(2026, 5, 1)).unwrap();
    let b_sessions = load_sessions(db.conn(), card_b).unwrap();
    advance_session(db.conn(), b_sessions[0].id, ymd(2026, 5, 2)).unwrap();
    advance_session(db.conn(), b_sessions[1].id, ymd(2026, 5, 7)).unwrap();

    assert_eq!(exam_session_progress(db.conn(), exam_id).unwrap(), (3, 5));
}

#[test]
fn session_cursors_report_next_incomplete_and_total() {
    let (_temp, db) = fresh_db();
    let exam_id = insert_exam(db.conn(), &sample_exam("Biologia", (2026, 6, 20))).unwrap();
    let card_a = insert_exam_card(&db, "Célula", exam_id);
    let card_b = insert_exam_card(&db, "Genética", exam_id);
    insert_sessions(db.conn(), card_a, &[ymd(2026, 5, 1), ymd(2026, 5, 6)]).unwrap();
    insert_sessions(
        db.conn(),
        card_b,
        &[ymd(2026, 5, 2), ymd(2026, 5, 7), ymd(2026, 5, 12)],
    )
    .unwrap();

    // Complete card A's first session and both of card B's first two.
    let a = load_sessions(db.conn(), card_a).unwrap();
    advance_session(db.conn(), a[0].id, ymd(2026, 5, 1)).unwrap();
    let b = load_sessions(db.conn(), card_b).unwrap();
    advance_session(db.conn(), b[0].id, ymd(2026, 5, 2)).unwrap();
    advance_session(db.conn(), b[1].id, ymd(2026, 5, 7)).unwrap();

    let mut cursors = session_cursors(db.conn()).unwrap();
    cursors.sort_by_key(|c| c.0);
    // 0-based next-incomplete seq + that session's due date: card A → seq 1 of 2 due 2026-05-06;
    // card B → seq 2 of 3 due 2026-05-12.
    assert_eq!(
        cursors,
        vec![
            (card_a, Some(1), 2, Some(ymd(2026, 5, 6))),
            (card_b, Some(2), 3, Some(ymd(2026, 5, 12))),
        ]
    );
}

#[test]
fn session_cursors_report_none_when_all_sessions_are_done() {
    let (_temp, db) = fresh_db();
    let exam_id = insert_exam(db.conn(), &sample_exam("Física", (2026, 6, 10))).unwrap();
    let card = insert_exam_card(&db, "Cinemática", exam_id);
    insert_sessions(db.conn(), card, &[ymd(2026, 5, 1), ymd(2026, 5, 6)]).unwrap();
    for s in load_sessions(db.conn(), card).unwrap() {
        advance_session(db.conn(), s.id, ymd(2026, 5, 8)).unwrap();
    }

    // Every session done → no cursor seq and no cursor due date.
    assert_eq!(
        session_cursors(db.conn()).unwrap(),
        vec![(card, None, 2, None)]
    );
}

#[test]
fn advance_session_stamps_completed_at() {
    let (_temp, db) = fresh_db();
    let exam_id = insert_exam(db.conn(), &sample_exam("História", (2026, 6, 5))).unwrap();
    let card_id = insert_exam_card(&db, "Idade Média", exam_id);
    insert_sessions(db.conn(), card_id, &[ymd(2026, 5, 1), ymd(2026, 5, 6)]).unwrap();

    let sessions = load_sessions(db.conn(), card_id).unwrap();
    advance_session(db.conn(), sessions[0].id, ymd(2026, 5, 3)).unwrap();

    let after = load_sessions(db.conn(), card_id).unwrap();
    assert_eq!(after[0].completed_at, Some(ymd(2026, 5, 3)));
    assert_eq!(after[1].completed_at, None);
}
