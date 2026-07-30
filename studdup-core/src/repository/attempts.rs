//! Written-attempt persistence — the `attempts` table (AD-011). Active Recall / Feynman sessions
//! record free text here (not on the `history` event log), and a card reads its attempts back in
//! reverse-chronological order (TECH-04.4). `kind` is stored as a snake_case string.

use rusqlite::{params, Connection, Row};

use crate::domain::{Attempt, AttemptKind, Date};
use crate::repository::{date_to_db, parse_date};

/// `AttemptKind` as stored in the `attempts.kind` TEXT column.
fn kind_to_db(k: AttemptKind) -> &'static str {
    match k {
        AttemptKind::ActiveRecall => "active_recall",
        AttemptKind::Feynman => "feynman",
    }
}

/// Parse a stored kind string, surfacing corrupt data as a rusqlite error rather than a panic.
fn kind_from_db(s: &str) -> rusqlite::Result<AttemptKind> {
    match s {
        "active_recall" => Ok(AttemptKind::ActiveRecall),
        "feynman" => Ok(AttemptKind::Feynman),
        other => Err(rusqlite::Error::InvalidColumnType(
            0,
            format!("unknown attempt kind in DB: {other}"),
            rusqlite::types::Type::Text,
        )),
    }
}

/// Record a written attempt for a card, returning its new autoincrement id.
pub fn record_attempt(
    conn: &Connection,
    card_id: i64,
    kind: AttemptKind,
    text: &str,
    created_at: Date,
) -> rusqlite::Result<i64> {
    conn.execute(
        "INSERT INTO attempts (card_id, kind, text, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![card_id, kind_to_db(kind), text, date_to_db(created_at)],
    )?;
    Ok(conn.last_insert_rowid())
}

/// Load a card's written attempts, newest first (TECH-04.4). `id DESC` breaks same-day ties.
pub fn load_attempts(conn: &Connection, card_id: i64) -> rusqlite::Result<Vec<Attempt>> {
    let mut stmt = conn.prepare(
        "SELECT id, card_id, kind, text, created_at FROM attempts \
         WHERE card_id = ?1 ORDER BY created_at DESC, id DESC",
    )?;
    let rows = stmt.query_map(params![card_id], row_to_attempt)?;
    rows.collect()
}

fn row_to_attempt(row: &Row) -> rusqlite::Result<Attempt> {
    Ok(Attempt {
        id: row.get(0)?,
        card_id: row.get(1)?,
        kind: kind_from_db(&row.get::<_, String>(2)?)?,
        text: row.get(3)?,
        created_at: parse_date(&row.get::<_, String>(4)?)?,
    })
}
