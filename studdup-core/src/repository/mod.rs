//! SQLite persistence — the only module that knows SQL. Ports the C++ `DatabaseManager`
//! (schema, WAL pragma, prepared-statement pattern) and extends it with this feature's tables.
//!
//! **Backward compatibility:** the two pre-existing C++ tables keep their exact names and column
//! names — `cards` and `history` (the event log) — so the same `srs.db` file opens unchanged
//! (MIG-01/02). New columns are added alongside; new tables (`exams`, `exam_sessions`,
//! `leitner_items`, `settings`) are created fresh.

use rusqlite::Connection;
use std::path::{Path, PathBuf};

use crate::domain::{Date, Method, Stage, Technique};

// Submodules are wired in as their tasks land (cards → T11, exams → T12, events → T13,
// migration → T14), keeping each task's build self-contained.
pub mod cards;
pub mod events;
pub mod exams;
pub mod migration;
pub mod settings;

/// The schema version this build targets, tracked via `PRAGMA user_version`. A C++ DB is 0;
/// v2 adds the `attempts` table for Active Recall / Feynman written attempts (AD-011).
pub const SCHEMA_VERSION: i64 = 2;

/// An open database connection plus the file path it was opened from (needed for backups).
pub struct Db {
    conn: Connection,
    path: Option<PathBuf>,
}

impl Db {
    /// Open (or create) the database file at `path`, applying the connection pragmas
    /// (`foreign_keys = ON`, `journal_mode = WAL`). Does not create the schema — call
    /// [`Db::create_schema`] for a fresh install, or `migration::migrate` to upgrade.
    pub fn open<P: AsRef<Path>>(path: P) -> rusqlite::Result<Db> {
        let path = path.as_ref().to_path_buf();
        let conn = Connection::open(&path)?;
        apply_pragmas(&conn)?;
        Ok(Db {
            conn,
            path: Some(path),
        })
    }

    /// Open an in-memory database (tests only). WAL is a no-op for `:memory:`.
    pub fn open_in_memory() -> rusqlite::Result<Db> {
        let conn = Connection::open_in_memory()?;
        apply_pragmas(&conn)?;
        Ok(Db { conn, path: None })
    }

    /// Borrow the underlying connection for repository operations.
    pub fn conn(&self) -> &Connection {
        &self.conn
    }

    /// The backing file path, if this DB is file-backed.
    pub fn path(&self) -> Option<&Path> {
        self.path.as_deref()
    }

    /// Create the full current schema on a fresh database and stamp it at [`SCHEMA_VERSION`].
    /// Uses `CREATE TABLE IF NOT EXISTS`, so it is safe to call on an already-created DB.
    pub fn create_schema(&self) -> rusqlite::Result<()> {
        create_schema(&self.conn)
    }
}

/// Per-connection pragmas, matching the C++ `DatabaseManager` constructor.
fn apply_pragmas(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    // journal_mode returns a row; execute_batch tolerates that. Harmless on :memory:.
    conn.pragma_update(None, "journal_mode", "WAL")?;
    Ok(())
}

/// The full current schema. `exams` is created before `cards` because `cards.exam_id` references
/// it. All statements are `IF NOT EXISTS`, so this converges the same whether run fresh or over
/// tables the migration already created.
pub(crate) fn create_schema(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS exams (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT NOT NULL,
            exam_date  TEXT NOT NULL,
            created_at TEXT NOT NULL,
            concluded  INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS cards (
            id                 INTEGER PRIMARY KEY AUTOINCREMENT,
            title              TEXT NOT NULL,
            content_link       TEXT NOT NULL DEFAULT '',
            review_link        TEXT NOT NULL DEFAULT '',
            start_date         TEXT NOT NULL,
            stage              INTEGER NOT NULL,
            archived           INTEGER NOT NULL DEFAULT 0,
            created_at         TEXT NOT NULL,
            last_completed_at  TEXT,
            method             TEXT NOT NULL DEFAULT 'spaced',
            technique          TEXT,
            est_minutes        INTEGER,
            pomodoro_focus_min INTEGER,
            pomodoro_break_min INTEGER,
            exam_id            INTEGER REFERENCES exams(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS exam_sessions (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id      INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
            seq          INTEGER NOT NULL,
            due_date     TEXT NOT NULL,
            completed_at TEXT
        );

        CREATE TABLE IF NOT EXISTS history (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id      INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
            event_type   TEXT NOT NULL,
            from_stage   INTEGER,
            to_stage     INTEGER,
            when_date    TEXT NOT NULL,
            method       TEXT NOT NULL DEFAULT 'spaced',
            technique    TEXT,
            focused_secs INTEGER,
            self_rating  INTEGER
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

        CREATE TABLE IF NOT EXISTS attempts (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id    INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
            kind       TEXT NOT NULL,
            text       TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_cards_archived ON cards(archived);
        CREATE INDEX IF NOT EXISTS idx_cards_method   ON cards(method);
        CREATE INDEX IF NOT EXISTS idx_cards_exam     ON cards(exam_id);
        CREATE INDEX IF NOT EXISTS idx_history_card   ON history(card_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_card  ON exam_sessions(card_id);
        CREATE INDEX IF NOT EXISTS idx_leitner_card   ON leitner_items(card_id);
        CREATE INDEX IF NOT EXISTS idx_attempts_card  ON attempts(card_id);
        ",
    )?;
    set_user_version(conn, SCHEMA_VERSION)?;
    Ok(())
}

/// Read `PRAGMA user_version`.
pub(crate) fn user_version(conn: &Connection) -> rusqlite::Result<i64> {
    conn.query_row("PRAGMA user_version", [], |row| row.get(0))
}

/// Set `PRAGMA user_version` (value is trusted; it is our own constant).
pub(crate) fn set_user_version(conn: &Connection, v: i64) -> rusqlite::Result<()> {
    conn.pragma_update(None, "user_version", v)
}

/// Whether a table with the given name exists in the main schema.
pub(crate) fn table_exists(conn: &Connection, name: &str) -> rusqlite::Result<bool> {
    let count: i64 = conn.query_row(
        "SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = ?1",
        [name],
        |row| row.get(0),
    )?;
    Ok(count > 0)
}

// ---- domain <-> DB value conversions (shared by cards/events) ----

/// Method as stored in TEXT columns. `spaced` is the migration default (MIG-02).
pub(crate) fn method_to_db(m: Method) -> &'static str {
    match m {
        Method::SpacedRepetition => "spaced",
        Method::ExamPrep => "exam",
    }
}

/// Parse a stored method string; unknown/legacy values fall back to spaced (MIG-02 default).
pub(crate) fn method_from_db(s: &str) -> Method {
    match s {
        "exam" => Method::ExamPrep,
        _ => Method::SpacedRepetition,
    }
}

/// Technique as stored in TEXT columns.
pub(crate) fn technique_to_db(t: Technique) -> &'static str {
    match t {
        Technique::Pomodoro => "pomodoro",
        Technique::ActiveRecall => "active_recall",
        Technique::Feynman => "feynman",
        Technique::Leitner => "leitner",
    }
}

/// Parse a stored technique string; `None` for NULL or unrecognized values.
pub(crate) fn technique_from_db(s: Option<&str>) -> Option<Technique> {
    match s {
        Some("pomodoro") => Some(Technique::Pomodoro),
        Some("active_recall") => Some(Technique::ActiveRecall),
        Some("feynman") => Some(Technique::Feynman),
        Some("leitner") => Some(Technique::Leitner),
        _ => None,
    }
}

/// Format a date for a TEXT column (ISO `YYYY-MM-DD`, the on-disk format C++ used).
pub(crate) fn date_to_db(d: Date) -> String {
    d.to_iso()
}

/// Format an optional date, mapping `None` to a SQL NULL.
pub(crate) fn opt_date_to_db(d: Option<Date>) -> Option<String> {
    d.map(|d| d.to_iso())
}

/// Parse a stored ISO date string, surfacing corrupt data as a rusqlite error rather than a panic.
pub(crate) fn parse_date(s: &str) -> rusqlite::Result<Date> {
    Date::from_iso(s).ok_or_else(|| {
        rusqlite::Error::InvalidColumnType(
            0,
            format!("invalid ISO date in DB: {s}"),
            rusqlite::types::Type::Text,
        )
    })
}

/// Parse an optional stored ISO date string.
pub(crate) fn opt_parse_date(s: Option<String>) -> rusqlite::Result<Option<Date>> {
    match s {
        Some(s) => parse_date(&s).map(Some),
        None => Ok(None),
    }
}

/// Stage stored as its day-offset integer (AD-003), matching the C++ `static_cast<int>(stage)`.
pub(crate) fn stage_to_db(s: Stage) -> i64 {
    s.offset() as i64
}

/// Parse a stored stage integer back to the enum; unknown values map to the `Done` sentinel.
pub(crate) fn stage_from_db(v: i64) -> Stage {
    match v {
        0 => Stage::Day0,
        1 => Stage::Day1,
        2 => Stage::Day2,
        5 => Stage::Day5,
        15 => Stage::Day15,
        30 => Stage::Day30,
        _ => Stage::Done,
    }
}
