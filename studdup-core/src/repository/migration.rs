//! Forward schema migration from the C++ database (version 0) to the current schema
//! (MIG-02/03/04/05). The contract is **backup-first, abort-safe, idempotent**:
//!
//! 1. If `user_version >= SCHEMA_VERSION`, do nothing (MIG-04 — already applied).
//! 2. Otherwise, if a `cards` table already exists (a real C++ DB), **write a timestamped backup
//!    copy first** and abort without touching the original if that copy fails (MIG-03/05).
//! 3. Then, in one transaction, create the new tables and `ALTER` the pre-existing `cards`/
//!    `history` tables to add the new columns, giving every existing card `method = 'spaced'`
//!    and `technique = NULL` while preserving all original fields (MIG-02). Finally stamp
//!    `user_version`.
//! 4. A brand-new database (no `cards` table) skips the backup and gets the full fresh schema.

use std::fmt;
use std::path::{Path, PathBuf};

use rusqlite::Connection;
use time::OffsetDateTime;

use crate::repository::{
    create_schema, set_user_version, table_exists, user_version, Db, SCHEMA_VERSION,
};

/// What a migration run did — for logging and for surfacing the backup location to the user.
#[derive(Debug, Clone, PartialEq)]
pub struct MigrationReport {
    /// Whether any schema change was applied (`false` = already at the target version).
    pub ran: bool,
    pub from_version: i64,
    pub to_version: i64,
    /// Path of the backup written before the upgrade, when one was needed.
    pub backup_path: Option<PathBuf>,
}

/// A migration failure: either the pre-migration backup failed (original left untouched) or a
/// SQL step failed (rolled back by the surrounding transaction).
#[derive(Debug)]
pub enum MigrationError {
    /// Backup copy failed — the migration aborted before modifying the database (MIG-03/05).
    Backup(std::io::Error),
    Sqlite(rusqlite::Error),
}

impl fmt::Display for MigrationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            MigrationError::Backup(e) => write!(f, "database backup failed before migration: {e}"),
            MigrationError::Sqlite(e) => write!(f, "migration SQL failed: {e}"),
        }
    }
}

impl std::error::Error for MigrationError {}

impl From<rusqlite::Error> for MigrationError {
    fn from(e: rusqlite::Error) -> Self {
        MigrationError::Sqlite(e)
    }
}

/// Bring `db` up to [`SCHEMA_VERSION`], backing up first when there is existing data to protect.
pub fn migrate(db: &Db) -> Result<MigrationReport, MigrationError> {
    let conn = db.conn();
    let path = db.path().map(Path::to_path_buf);
    migrate_impl(conn, || default_backup(conn, path.as_deref()))
}

/// Core migration logic with an injectable backup step (the seam the backup-failure test uses).
/// `backup` is only invoked when there is a pre-existing `cards` table to protect.
fn migrate_impl<B>(conn: &Connection, backup: B) -> Result<MigrationReport, MigrationError>
where
    B: FnOnce() -> Result<Option<PathBuf>, MigrationError>,
{
    let from = user_version(conn)?;
    if from >= SCHEMA_VERSION {
        return Ok(MigrationReport {
            ran: false,
            from_version: from,
            to_version: from,
            backup_path: None,
        });
    }

    if table_exists(conn, "cards")? {
        // Existing (C++) data: back it up BEFORE any write; abort untouched on failure.
        let backup_path = backup()?;
        run_upgrade(conn)?;
        Ok(MigrationReport {
            ran: true,
            from_version: from,
            to_version: SCHEMA_VERSION,
            backup_path,
        })
    } else {
        // Brand-new database: nothing to back up, just create the full schema.
        create_schema(conn)?;
        Ok(MigrationReport {
            ran: true,
            from_version: from,
            to_version: SCHEMA_VERSION,
            backup_path: None,
        })
    }
}

/// Write a timestamped backup copy alongside the database file. Returns the backup path, or
/// `Ok(None)` for a path-less (in-memory) connection. A WAL checkpoint first folds pending
/// changes into the main file so the copy is complete.
fn default_backup(
    conn: &Connection,
    path: Option<&Path>,
) -> Result<Option<PathBuf>, MigrationError> {
    let Some(path) = path else {
        return Ok(None);
    };
    // Best-effort: fold the WAL into the main db file so the plain copy is consistent.
    let _ = conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);");
    let now = OffsetDateTime::now_local().unwrap_or_else(|_| OffsetDateTime::now_utc());
    let stamp = format!(
        "{:04}{:02}{:02}-{:02}{:02}{:02}-{:09}",
        now.year(),
        u8::from(now.month()),
        now.day(),
        now.hour(),
        now.minute(),
        now.second(),
        now.nanosecond(),
    );
    let backup = PathBuf::from(format!("{}.bak-{}", path.display(), stamp));
    std::fs::copy(path, &backup).map_err(MigrationError::Backup)?;
    Ok(Some(backup))
}

/// The v0 → v1 delta: create the new tables, add the new columns to the pre-existing `cards` and
/// `history` tables, then (re)create indexes and stamp the version — all in one transaction, so a
/// failure at any step rolls the whole thing back.
fn run_upgrade(conn: &Connection) -> rusqlite::Result<()> {
    let tx = conn.unchecked_transaction()?;

    // New tables first (so the `exam_id` foreign key below has its parent table).
    tx.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS exams (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT NOT NULL,
            exam_date  TEXT NOT NULL,
            created_at TEXT NOT NULL,
            concluded  INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS exam_sessions (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id      INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
            seq          INTEGER NOT NULL,
            due_date     TEXT NOT NULL,
            completed_at TEXT
        );
        CREATE TABLE IF NOT EXISTS leitner_items (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id  INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
            front    TEXT NOT NULL,
            back     TEXT NOT NULL,
            box_no   INTEGER NOT NULL DEFAULT 1,
            due_date TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        ",
    )?;

    // Existing cards keep every field; new columns default to spaced/NULL (MIG-02).
    add_column_if_missing(&tx, "cards", "method", "TEXT NOT NULL DEFAULT 'spaced'")?;
    add_column_if_missing(&tx, "cards", "technique", "TEXT")?;
    add_column_if_missing(&tx, "cards", "est_minutes", "INTEGER")?;
    add_column_if_missing(&tx, "cards", "pomodoro_focus_min", "INTEGER")?;
    add_column_if_missing(&tx, "cards", "pomodoro_break_min", "INTEGER")?;
    add_column_if_missing(
        &tx,
        "cards",
        "exam_id",
        "INTEGER REFERENCES exams(id) ON DELETE CASCADE",
    )?;

    add_column_if_missing(&tx, "history", "method", "TEXT NOT NULL DEFAULT 'spaced'")?;
    add_column_if_missing(&tx, "history", "technique", "TEXT")?;
    add_column_if_missing(&tx, "history", "focused_secs", "INTEGER")?;
    add_column_if_missing(&tx, "history", "self_rating", "INTEGER")?;

    // Indexes (created after the columns they reference exist).
    tx.execute_batch(
        "
        CREATE INDEX IF NOT EXISTS idx_cards_archived ON cards(archived);
        CREATE INDEX IF NOT EXISTS idx_cards_method   ON cards(method);
        CREATE INDEX IF NOT EXISTS idx_cards_exam     ON cards(exam_id);
        CREATE INDEX IF NOT EXISTS idx_history_card   ON history(card_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_card  ON exam_sessions(card_id);
        CREATE INDEX IF NOT EXISTS idx_leitner_card   ON leitner_items(card_id);
        ",
    )?;

    set_user_version(&tx, SCHEMA_VERSION)?;
    tx.commit()
}

/// Whether `table` already has a column named `col`.
fn column_exists(conn: &Connection, table: &str, col: &str) -> rusqlite::Result<bool> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({table})"))?;
    let mut rows = stmt.query([])?;
    while let Some(row) = rows.next()? {
        let name: String = row.get(1)?;
        if name == col {
            return Ok(true);
        }
    }
    Ok(false)
}

/// `ALTER TABLE ... ADD COLUMN` only when the column is not already present (idempotent).
fn add_column_if_missing(
    conn: &Connection,
    table: &str,
    col: &str,
    decl: &str,
) -> rusqlite::Result<()> {
    if !column_exists(conn, table, col)? {
        conn.execute_batch(&format!("ALTER TABLE {table} ADD COLUMN {col} {decl};"))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Build an old C++-schema DB in memory (the exact `cards`/`history` DDL from
    /// DatabaseManager.cpp) at `user_version = 0` with one card, and confirm a **backup failure
    /// leaves the original untouched** (no new columns, version still 0) — MIG-05.
    #[test]
    fn backup_failure_leaves_database_untouched() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "
            CREATE TABLE cards (
                id                INTEGER PRIMARY KEY AUTOINCREMENT,
                title             TEXT NOT NULL,
                content_link      TEXT NOT NULL DEFAULT '',
                review_link       TEXT NOT NULL DEFAULT '',
                start_date        TEXT NOT NULL,
                stage             INTEGER NOT NULL,
                archived          INTEGER NOT NULL DEFAULT 0,
                created_at        TEXT NOT NULL,
                last_completed_at TEXT
            );
            INSERT INTO cards (title, start_date, stage, created_at)
            VALUES ('Antiga', '2026-04-29', 5, '2026-04-01');
            ",
        )
        .unwrap();
        assert_eq!(user_version(&conn).unwrap(), 0);

        let result = migrate_impl(&conn, || {
            Err(MigrationError::Backup(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                "simulated backup failure",
            )))
        });

        assert!(matches!(result, Err(MigrationError::Backup(_))));
        // Original untouched: version still 0, and no new `method` column was added.
        assert_eq!(user_version(&conn).unwrap(), 0);
        assert!(!column_exists(&conn, "cards", "method").unwrap());
        // The row is still there and unchanged.
        let title: String = conn
            .query_row("SELECT title FROM cards WHERE id = 1", [], |r| r.get(0))
            .unwrap();
        assert_eq!(title, "Antiga");
    }
}
