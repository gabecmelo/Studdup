//! Card persistence — insert / update / delete / method-scoped loads. Ports the C++
//! `DatabaseManager` card operations and extends them with the method/technique/session columns.
//! Deleting a card cascades to its sessions, history and Leitner items via the FK constraints.

use rusqlite::{params, Connection, Row};

use crate::domain::{Card, Method, PomodoroRhythm};
use crate::repository::{
    date_to_db, method_from_db, method_to_db, opt_date_to_db, opt_parse_date, parse_date,
    stage_from_db, stage_to_db, technique_from_db, technique_to_db,
};

/// SELECT column list, shared by every load so the row mapper column indices stay in sync.
const SELECT_COLS: &str = "id, title, content_link, review_link, start_date, stage, archived, \
     created_at, last_completed_at, method, technique, est_minutes, \
     pomodoro_focus_min, pomodoro_break_min, exam_id, pomodoro_cycles";

/// Insert a card, returning its new autoincrement id. All new columns are persisted.
pub fn insert_card(conn: &Connection, c: &Card) -> rusqlite::Result<i64> {
    conn.execute(
        "INSERT INTO cards \
         (title, content_link, review_link, start_date, stage, archived, created_at, \
          last_completed_at, method, technique, est_minutes, pomodoro_focus_min, \
          pomodoro_break_min, exam_id, pomodoro_cycles) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
        params![
            c.title,
            c.content_link,
            c.review_link,
            date_to_db(c.start_date),
            stage_to_db(c.current_stage),
            c.archived,
            date_to_db(c.created_at),
            opt_date_to_db(c.last_completed_at),
            method_to_db(c.method),
            c.technique.map(technique_to_db),
            c.est_minutes,
            c.pomodoro.map(|p| p.focus_min),
            c.pomodoro.map(|p| p.break_min),
            c.exam_id,
            c.pomodoro.map(|p| p.cycles),
        ],
    )?;
    Ok(conn.last_insert_rowid())
}

/// Update every column of an existing card (matched by `id`).
pub fn update_card(conn: &Connection, c: &Card) -> rusqlite::Result<()> {
    conn.execute(
        "UPDATE cards SET title=?1, content_link=?2, review_link=?3, start_date=?4, stage=?5, \
         archived=?6, created_at=?7, last_completed_at=?8, method=?9, technique=?10, \
         est_minutes=?11, pomodoro_focus_min=?12, pomodoro_break_min=?13, exam_id=?14, \
         pomodoro_cycles=?15 WHERE id=?16",
        params![
            c.title,
            c.content_link,
            c.review_link,
            date_to_db(c.start_date),
            stage_to_db(c.current_stage),
            c.archived,
            date_to_db(c.created_at),
            opt_date_to_db(c.last_completed_at),
            method_to_db(c.method),
            c.technique.map(technique_to_db),
            c.est_minutes,
            c.pomodoro.map(|p| p.focus_min),
            c.pomodoro.map(|p| p.break_min),
            c.exam_id,
            c.pomodoro.map(|p| p.cycles),
            c.id,
        ],
    )?;
    Ok(())
}

/// Delete a card by id. Its exam sessions, history events and Leitner items cascade away.
pub fn delete_card(conn: &Connection, id: i64) -> rusqlite::Result<()> {
    conn.execute("DELETE FROM cards WHERE id = ?1", params![id])?;
    Ok(())
}

/// Load a single card by id, regardless of method or archived state. `None` when no such card
/// exists. Used by the `core::api` facade to fetch the card an id-based action operates on.
pub fn load_card(conn: &Connection, id: i64) -> rusqlite::Result<Option<Card>> {
    let sql = format!("SELECT {SELECT_COLS} FROM cards WHERE id = ?1");
    let mut stmt = conn.prepare(&sql)?;
    let mut rows = stmt.query_map(params![id], row_to_card)?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

/// Active (non-archived) cards for a method, ordered as the C++ agenda was
/// (`start_date ASC, stage ASC`).
pub fn load_active(conn: &Connection, method: Method) -> rusqlite::Result<Vec<Card>> {
    load_where(
        conn,
        "archived = 0 AND method = ?1",
        "start_date ASC, stage ASC",
        method,
    )
}

/// Active (non-archived) cards belonging to a specific exam, oldest first. Drives the
/// auto-conclusion sweep (EXAM-01.5): when an exam lapses, these are the cards to archive.
pub fn load_active_for_exam(conn: &Connection, exam_id: i64) -> rusqlite::Result<Vec<Card>> {
    let sql = format!(
        "SELECT {SELECT_COLS} FROM cards WHERE archived = 0 AND exam_id = ?1 ORDER BY id ASC"
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params![exam_id], row_to_card)?;
    rows.collect()
}

/// Archived cards for a method, most-recently-completed first (C++ history ordering).
pub fn load_archived(conn: &Connection, method: Method) -> rusqlite::Result<Vec<Card>> {
    load_where(
        conn,
        "archived = 1 AND method = ?1",
        "last_completed_at DESC, id DESC",
        method,
    )
}

fn load_where(
    conn: &Connection,
    where_clause: &str,
    order: &str,
    method: Method,
) -> rusqlite::Result<Vec<Card>> {
    let sql = format!("SELECT {SELECT_COLS} FROM cards WHERE {where_clause} ORDER BY {order}");
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params![method_to_db(method)], row_to_card)?;
    rows.collect()
}

/// Map a full-column card row to a `Card`. Column order must match [`SELECT_COLS`].
fn row_to_card(row: &Row) -> rusqlite::Result<Card> {
    let focus: Option<u16> = row.get(12)?;
    let brk: Option<u16> = row.get(13)?;
    let cycles: Option<u16> = row.get(15)?;
    let pomodoro = match (focus, brk) {
        (Some(focus_min), Some(break_min)) => Some(PomodoroRhythm {
            focus_min,
            break_min,
            // A v2-migrated Pomodoro card has a NULL cycles column; it reads back as the default 4.
            cycles: cycles.unwrap_or(4),
        }),
        _ => None,
    };
    let technique: Option<String> = row.get(10)?;
    Ok(Card {
        id: row.get(0)?,
        title: row.get(1)?,
        content_link: row.get(2)?,
        review_link: row.get(3)?,
        start_date: parse_date(&row.get::<_, String>(4)?)?,
        current_stage: stage_from_db(row.get(5)?),
        archived: row.get(6)?,
        created_at: parse_date(&row.get::<_, String>(7)?)?,
        last_completed_at: opt_parse_date(row.get(8)?)?,
        method: method_from_db(&row.get::<_, String>(9)?),
        technique: technique_from_db(technique.as_deref()),
        est_minutes: row.get(11)?,
        pomodoro,
        exam_id: row.get(14)?,
    })
}
