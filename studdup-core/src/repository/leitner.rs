//! Leitner item persistence — the `leitner_items` table (TECH-08). Front/back pairs scoped to a
//! Leitner-technique card; each carries a box (1–5) and a due date. New items enter box 1 due today
//! ([`add_leitner_item`]); a review applies the pure box math ([`crate::scheduler::leitner`]) and
//! persists the new box + due date ([`review_item`]). Deleting the card cascades its items away.

use rusqlite::{params, Connection, Row};

use crate::domain::{Date, LeitnerItem};
use crate::repository::{date_to_db, parse_date};
use crate::scheduler::leitner::leitner_review;

/// SELECT column list, shared by every load so the row-mapper indices stay in sync.
const SELECT_COLS: &str = "id, card_id, front, back, box_no, due_date";

/// Add a front/back item to a Leitner card at box 1, due today (TECH-08.1). Returns its new id.
pub fn add_leitner_item(
    conn: &Connection,
    card_id: i64,
    front: &str,
    back: &str,
    today: Date,
) -> rusqlite::Result<i64> {
    conn.execute(
        "INSERT INTO leitner_items (card_id, front, back, box_no, due_date) \
         VALUES (?1, ?2, ?3, 1, ?4)",
        params![card_id, front, back, date_to_db(today)],
    )?;
    Ok(conn.last_insert_rowid())
}

/// All of a card's Leitner items, oldest first (`id ASC`) — the item editor list (TECH-08.1).
pub fn load_items(conn: &Connection, card_id: i64) -> rusqlite::Result<Vec<LeitnerItem>> {
    let sql = format!("SELECT {SELECT_COLS} FROM leitner_items WHERE card_id = ?1 ORDER BY id ASC");
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params![card_id], row_to_item)?;
    rows.collect()
}

/// A card's items that are due in a session started on `today` — `due_date <= today` (TECH-08.4).
pub fn load_due(
    conn: &Connection,
    card_id: i64,
    today: Date,
) -> rusqlite::Result<Vec<LeitnerItem>> {
    let sql = format!(
        "SELECT {SELECT_COLS} FROM leitner_items \
         WHERE card_id = ?1 AND due_date <= ?2 ORDER BY box_no ASC, id ASC"
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params![card_id, date_to_db(today)], row_to_item)?;
    rows.collect()
}

/// Load a single item by id (`None` when it does not exist).
pub fn load_item(conn: &Connection, item_id: i64) -> rusqlite::Result<Option<LeitnerItem>> {
    let sql = format!("SELECT {SELECT_COLS} FROM leitner_items WHERE id = ?1");
    let mut stmt = conn.prepare(&sql)?;
    let mut rows = stmt.query_map(params![item_id], row_to_item)?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

/// Review an item: apply the box transition (TECH-08.2/3, correct → promote capped at 5, wrong →
/// box 1) and persist the new box + due date. Returns the updated item, or `None` when no item with
/// that id exists.
pub fn review_item(
    conn: &Connection,
    item_id: i64,
    correct: bool,
    today: Date,
) -> rusqlite::Result<Option<LeitnerItem>> {
    let Some(item) = load_item(conn, item_id)? else {
        return Ok(None);
    };
    let (new_box, due) = leitner_review(item.box_no, correct, today);
    conn.execute(
        "UPDATE leitner_items SET box_no = ?2, due_date = ?3 WHERE id = ?1",
        params![item_id, new_box, date_to_db(due)],
    )?;
    Ok(Some(LeitnerItem {
        box_no: new_box,
        due_date: due,
        ..item
    }))
}

fn row_to_item(row: &Row) -> rusqlite::Result<LeitnerItem> {
    Ok(LeitnerItem {
        id: row.get(0)?,
        card_id: row.get(1)?,
        front: row.get(2)?,
        back: row.get(3)?,
        box_no: row.get(4)?,
        due_date: parse_date(&row.get::<_, String>(5)?)?,
    })
}
