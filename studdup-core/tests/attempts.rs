//! T43 — attempts repository: reverse-chronological reads (TECH-04.4) and FK cascade on card delete.

mod common;

use common::{sample_card, ymd, TempDb};
use studdup_core::domain::AttemptKind;
use studdup_core::repository::attempts::{load_attempts, record_attempt};
use studdup_core::repository::cards::{delete_card, insert_card};
use studdup_core::repository::Db;

fn fresh_db() -> (TempDb, Db) {
    let temp = TempDb::new();
    let db = Db::open(&temp.path).unwrap();
    db.create_schema().unwrap();
    (temp, db)
}

/// Insert a card and return its id (attempts need a real parent for the FK).
fn a_card(db: &Db, title: &str) -> i64 {
    insert_card(db.conn(), &sample_card(title)).unwrap()
}

#[test]
fn attempts_load_newest_first() {
    let (_temp, db) = fresh_db();
    let card = a_card(&db, "Fotossíntese");

    // Insert three attempts; ORDER BY created_at DESC, id DESC must return them newest-first,
    // with id breaking ties among same-day inserts.
    record_attempt(
        db.conn(),
        card,
        AttemptKind::ActiveRecall,
        "primeira",
        ymd(2026, 5, 1),
    )
    .unwrap();
    record_attempt(
        db.conn(),
        card,
        AttemptKind::Feynman,
        "segunda",
        ymd(2026, 5, 3),
    )
    .unwrap();
    record_attempt(
        db.conn(),
        card,
        AttemptKind::ActiveRecall,
        "terceira",
        ymd(2026, 5, 3),
    )
    .unwrap();

    let loaded = load_attempts(db.conn(), card).unwrap();
    assert_eq!(loaded.len(), 3);
    // Newest date first; the two same-day rows are ordered by descending id (terceira before segunda).
    assert_eq!(loaded[0].text, "terceira");
    assert_eq!(loaded[1].text, "segunda");
    assert_eq!(loaded[2].text, "primeira");
    // Kind and date round-trip.
    assert_eq!(loaded[0].kind, AttemptKind::ActiveRecall);
    assert_eq!(loaded[1].kind, AttemptKind::Feynman);
    assert_eq!(loaded[0].created_at, ymd(2026, 5, 3));
    assert_eq!(loaded[0].card_id, card);
}

#[test]
fn attempts_are_scoped_to_their_card() {
    let (_temp, db) = fresh_db();
    let a = a_card(&db, "Card A");
    let b = a_card(&db, "Card B");
    record_attempt(db.conn(), a, AttemptKind::Feynman, "de A", ymd(2026, 5, 1)).unwrap();
    record_attempt(db.conn(), b, AttemptKind::Feynman, "de B", ymd(2026, 5, 1)).unwrap();

    assert_eq!(load_attempts(db.conn(), a).unwrap().len(), 1);
    assert_eq!(load_attempts(db.conn(), a).unwrap()[0].text, "de A");
}

#[test]
fn attempts_cascade_when_the_card_is_deleted() {
    let (_temp, db) = fresh_db();
    let card = a_card(&db, "Efêmero");
    record_attempt(
        db.conn(),
        card,
        AttemptKind::ActiveRecall,
        "some junto",
        ymd(2026, 5, 1),
    )
    .unwrap();
    assert_eq!(load_attempts(db.conn(), card).unwrap().len(), 1);

    // FK ON DELETE CASCADE (foreign_keys pragma is ON): deleting the card removes its attempts.
    delete_card(db.conn(), card).unwrap();
    assert_eq!(load_attempts(db.conn(), card).unwrap().len(), 0);
}

#[test]
fn empty_card_has_no_attempts() {
    let (_temp, db) = fresh_db();
    let card = a_card(&db, "Sem tentativas");
    assert_eq!(load_attempts(db.conn(), card).unwrap().len(), 0);
}
