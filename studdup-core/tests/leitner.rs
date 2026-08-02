//! T54 — Leitner item repository: add at box 1 due today, list, due-filter, and review moving box +
//! due (TECH-08.1/2/3/4), plus FK cascade on card delete.

mod common;

use common::{sample_card, ymd, TempDb};
use studdup_core::repository::cards::{delete_card, insert_card};
use studdup_core::repository::leitner::{add_leitner_item, load_due, load_items, review_item};
use studdup_core::repository::Db;

fn fresh_db() -> (TempDb, Db) {
    let temp = TempDb::new();
    let db = Db::open(&temp.path).unwrap();
    db.create_schema().unwrap();
    (temp, db)
}

/// Insert a card and return its id (Leitner items need a real parent for the FK).
fn a_card(db: &Db, title: &str) -> i64 {
    insert_card(db.conn(), &sample_card(title)).unwrap()
}

#[test]
fn add_enters_box_one_due_today() {
    let (_temp, db) = fresh_db();
    let card = a_card(&db, "Capitais");
    let today = ymd(2026, 5, 1);

    let id = add_leitner_item(db.conn(), card, "capital da França", "Paris", today).unwrap();
    assert!(id > 0);

    let items = load_items(db.conn(), card).unwrap();
    assert_eq!(items.len(), 1);
    assert_eq!(items[0].front, "capital da França");
    assert_eq!(items[0].back, "Paris");
    assert_eq!(items[0].box_no, 1, "new items enter box 1 (AD-012)");
    assert_eq!(items[0].due_date, today, "new items are due today");
    assert_eq!(items[0].card_id, card);
}

#[test]
fn items_are_scoped_to_their_card_and_ordered() {
    let (_temp, db) = fresh_db();
    let a = a_card(&db, "Baralho A");
    let b = a_card(&db, "Baralho B");
    let today = ymd(2026, 5, 1);
    add_leitner_item(db.conn(), a, "a1", "x", today).unwrap();
    add_leitner_item(db.conn(), a, "a2", "y", today).unwrap();
    add_leitner_item(db.conn(), b, "b1", "z", today).unwrap();

    let a_items = load_items(db.conn(), a).unwrap();
    assert_eq!(a_items.len(), 2);
    assert_eq!(a_items[0].front, "a1", "oldest first");
    assert_eq!(a_items[1].front, "a2");
    assert_eq!(load_items(db.conn(), b).unwrap().len(), 1);
}

#[test]
fn load_due_filters_by_due_date() {
    let (_temp, db) = fresh_db();
    let card = a_card(&db, "Vocabulário");
    let today = ymd(2026, 5, 10);

    // One item due today, one already reviewed forward to the future.
    add_leitner_item(db.conn(), card, "devido", "hoje", today).unwrap();
    let future = add_leitner_item(db.conn(), card, "adiado", "depois", today).unwrap();
    // Reviewing it correct pushes it to today + 2 (box 2 interval), out of today's session.
    review_item(db.conn(), future, true, today).unwrap();

    let due = load_due(db.conn(), card, today).unwrap();
    assert_eq!(due.len(), 1, "only the item due <= today");
    assert_eq!(due[0].front, "devido");

    // The reviewed item becomes due again once its due date arrives.
    let later = today.add_days(2);
    let due_later = load_due(db.conn(), card, later).unwrap();
    assert_eq!(due_later.len(), 2, "both due by today + 2");
}

#[test]
fn review_correct_promotes_box_and_moves_due() {
    let (_temp, db) = fresh_db();
    let card = a_card(&db, "Fórmulas");
    let today = ymd(2026, 5, 1);
    let id = add_leitner_item(db.conn(), card, "área do círculo", "πr²", today).unwrap();

    let updated = review_item(db.conn(), id, true, today).unwrap().unwrap();
    assert_eq!(updated.box_no, 2, "box 1 correct → box 2");
    assert_eq!(
        updated.due_date,
        today.add_days(2),
        "box 2 interval = 2 days"
    );

    // Persisted, not just returned.
    let reloaded = &load_items(db.conn(), card).unwrap()[0];
    assert_eq!(reloaded.box_no, 2);
    assert_eq!(reloaded.due_date, today.add_days(2));
}

#[test]
fn review_wrong_resets_to_box_one_due_tomorrow() {
    let (_temp, db) = fresh_db();
    let card = a_card(&db, "Datas");
    let today = ymd(2026, 5, 1);
    let id = add_leitner_item(db.conn(), card, "queda da Bastilha", "1789", today).unwrap();

    // Promote it up a few boxes, then miss it.
    review_item(db.conn(), id, true, today).unwrap(); // box 2
    review_item(db.conn(), id, true, today).unwrap(); // box 3
    let missed = review_item(db.conn(), id, false, today).unwrap().unwrap();
    assert_eq!(missed.box_no, 1, "wrong returns to box 1 (TECH-08.3)");
    assert_eq!(missed.due_date, today.add_days(1), "box 1 interval = 1 day");
}

#[test]
fn review_missing_item_is_none() {
    let (_temp, db) = fresh_db();
    let today = ymd(2026, 5, 1);
    assert!(review_item(db.conn(), 999, true, today).unwrap().is_none());
}

#[test]
fn items_cascade_when_the_card_is_deleted() {
    let (_temp, db) = fresh_db();
    let card = a_card(&db, "Efêmero");
    let today = ymd(2026, 5, 1);
    add_leitner_item(db.conn(), card, "some", "junto", today).unwrap();
    assert_eq!(load_items(db.conn(), card).unwrap().len(), 1);

    // FK ON DELETE CASCADE removes the card's items.
    delete_card(db.conn(), card).unwrap();
    assert_eq!(load_items(db.conn(), card).unwrap().len(), 0);
}
