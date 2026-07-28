//! Exam and materialized-session persistence (AD-005, C1). Sessions are written once at card
//! creation (`insert_sessions`) and only ever have their `completed_at` stamped (`advance_session`)
//! — their `due_date`s are never recomputed (AD-010). Deleting an exam cascades to its cards, and
//! each card cascades to its sessions/history/leitner items.

use rusqlite::{params, Connection, Row};

use crate::domain::{Date, Exam, ExamSession};
use crate::repository::{date_to_db, opt_parse_date, parse_date};

/// Insert an exam, returning its new id.
pub fn insert_exam(conn: &Connection, e: &Exam) -> rusqlite::Result<i64> {
    conn.execute(
        "INSERT INTO exams (name, exam_date, created_at, concluded) VALUES (?1, ?2, ?3, ?4)",
        params![
            e.name,
            date_to_db(e.exam_date),
            date_to_db(e.created_at),
            e.concluded
        ],
    )?;
    Ok(conn.last_insert_rowid())
}

/// All exams, soonest exam date first (drives the exams rail / list).
pub fn load_exams(conn: &Connection) -> rusqlite::Result<Vec<Exam>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, exam_date, created_at, concluded FROM exams ORDER BY exam_date ASC, id ASC",
    )?;
    let rows = stmt.query_map([], row_to_exam)?;
    rows.collect()
}

/// Mark an exam concluded (EXAM-02.5, when its date has passed).
pub fn set_exam_concluded(
    conn: &Connection,
    exam_id: i64,
    concluded: bool,
) -> rusqlite::Result<()> {
    conn.execute(
        "UPDATE exams SET concluded = ?2 WHERE id = ?1",
        params![exam_id, concluded],
    )?;
    Ok(())
}

/// Delete an exam and, by FK cascade, all of its cards and each card's sessions/history/items
/// (EXAM-04). One delete because `cards.exam_id REFERENCES exams(id) ON DELETE CASCADE`.
pub fn delete_exam_cascade(conn: &Connection, exam_id: i64) -> rusqlite::Result<()> {
    conn.execute("DELETE FROM exams WHERE id = ?1", params![exam_id])?;
    Ok(())
}

/// Materialize a card's session schedule from the distribution dates: `seq = index`,
/// `due_date = dates[index]`, `completed_at = NULL`.
pub fn insert_sessions(conn: &Connection, card_id: i64, dates: &[Date]) -> rusqlite::Result<()> {
    let mut stmt = conn.prepare(
        "INSERT INTO exam_sessions (card_id, seq, due_date, completed_at) VALUES (?1, ?2, ?3, NULL)",
    )?;
    for (i, date) in dates.iter().enumerate() {
        stmt.execute(params![card_id, i as i64, date_to_db(*date)])?;
    }
    Ok(())
}

/// A card's sessions in study order (`seq ASC`).
pub fn load_sessions(conn: &Connection, card_id: i64) -> rusqlite::Result<Vec<ExamSession>> {
    let mut stmt = conn.prepare(
        "SELECT id, card_id, seq, due_date, completed_at FROM exam_sessions \
         WHERE card_id = ?1 ORDER BY seq ASC",
    )?;
    let rows = stmt.query_map(params![card_id], row_to_session)?;
    rows.collect()
}

/// Stamp a specific session as completed on `when`.
pub fn advance_session(conn: &Connection, session_id: i64, when: Date) -> rusqlite::Result<()> {
    conn.execute(
        "UPDATE exam_sessions SET completed_at = ?2 WHERE id = ?1",
        params![session_id, date_to_db(when)],
    )?;
    Ok(())
}

/// Reschedule a session by overwriting its `due_date` (used when an exam card is postponed —
/// the current cursor session shifts). `completed_at` is untouched.
pub fn set_session_due_date(conn: &Connection, session_id: i64, due: Date) -> rusqlite::Result<()> {
    conn.execute(
        "UPDATE exam_sessions SET due_date = ?2 WHERE id = ?1",
        params![session_id, date_to_db(due)],
    )?;
    Ok(())
}

/// `(completed, total)` session counts across all cards of an exam (EXAM-01.6 progress).
pub fn exam_session_progress(conn: &Connection, exam_id: i64) -> rusqlite::Result<(i64, i64)> {
    conn.query_row(
        "SELECT count(s.completed_at), count(*) \
         FROM exam_sessions s JOIN cards c ON c.id = s.card_id \
         WHERE c.exam_id = ?1",
        params![exam_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )
}

fn row_to_exam(row: &Row) -> rusqlite::Result<Exam> {
    Ok(Exam {
        id: row.get(0)?,
        name: row.get(1)?,
        exam_date: parse_date(&row.get::<_, String>(2)?)?,
        created_at: parse_date(&row.get::<_, String>(3)?)?,
        concluded: row.get(4)?,
    })
}

fn row_to_session(row: &Row) -> rusqlite::Result<ExamSession> {
    Ok(ExamSession {
        id: row.get(0)?,
        card_id: row.get(1)?,
        seq: row.get(2)?,
        due_date: parse_date(&row.get::<_, String>(3)?)?,
        completed_at: opt_parse_date(row.get(4)?)?,
    })
}
