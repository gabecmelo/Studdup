//! T10 — fresh-install schema: all tables created, C++ column names preserved, WAL + FKs on.

mod common;

use common::TempDb;
use rusqlite::Connection;
use studdup_core::repository::{Db, SCHEMA_VERSION};

/// Column names of a table, via `PRAGMA table_info`.
fn columns(conn: &Connection, table: &str) -> Vec<String> {
    let mut stmt = conn
        .prepare(&format!("PRAGMA table_info({table})"))
        .unwrap();
    let names = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .unwrap()
        .map(Result::unwrap)
        .collect();
    names
}

/// All table names in the main schema.
fn table_names(conn: &Connection) -> Vec<String> {
    let mut stmt = conn
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
        .unwrap();
    let names = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .unwrap()
        .map(Result::unwrap)
        .collect();
    names
}

#[test]
fn fresh_schema_creates_all_tables() {
    let temp = TempDb::new();
    let db = Db::open(&temp.path).unwrap();
    db.create_schema().unwrap();

    let tables = table_names(db.conn());
    for expected in [
        "cards",
        "exams",
        "exam_sessions",
        "history",
        "leitner_items",
        "settings",
    ] {
        assert!(
            tables.iter().any(|t| t == expected),
            "missing table {expected}; have {tables:?}"
        );
    }
}

#[test]
fn cards_table_preserves_cpp_columns_and_adds_new_ones() {
    let temp = TempDb::new();
    let db = Db::open(&temp.path).unwrap();
    db.create_schema().unwrap();

    let cols = columns(db.conn(), "cards");
    // Exact C++ `cards` column names (DatabaseManager.cpp) must be preserved (MIG-01/02).
    for cpp in [
        "id",
        "title",
        "content_link",
        "review_link",
        "start_date",
        "stage",
        "archived",
        "created_at",
        "last_completed_at",
    ] {
        assert!(cols.iter().any(|c| c == cpp), "cards missing C++ column {cpp}");
    }
    // New columns for this feature.
    for new in [
        "method",
        "technique",
        "est_minutes",
        "pomodoro_focus_min",
        "pomodoro_break_min",
        "exam_id",
    ] {
        assert!(cols.iter().any(|c| c == new), "cards missing new column {new}");
    }
}

#[test]
fn history_table_preserves_cpp_columns_and_adds_new_ones() {
    let temp = TempDb::new();
    let db = Db::open(&temp.path).unwrap();
    db.create_schema().unwrap();

    let cols = columns(db.conn(), "history");
    for cpp in ["id", "card_id", "event_type", "from_stage", "to_stage", "when_date"] {
        assert!(cols.iter().any(|c| c == cpp), "history missing C++ column {cpp}");
    }
    for new in ["method", "technique", "focused_secs", "self_rating"] {
        assert!(cols.iter().any(|c| c == new), "history missing new column {new}");
    }
}

#[test]
fn fresh_schema_is_stamped_at_current_version() {
    let temp = TempDb::new();
    let db = Db::open(&temp.path).unwrap();
    db.create_schema().unwrap();

    let version: i64 = db
        .conn()
        .query_row("PRAGMA user_version", [], |r| r.get(0))
        .unwrap();
    assert_eq!(version, SCHEMA_VERSION);
    assert_eq!(SCHEMA_VERSION, 1);
}

#[test]
fn connection_uses_wal_and_foreign_keys() {
    let temp = TempDb::new();
    let db = Db::open(&temp.path).unwrap();

    let journal: String = db
        .conn()
        .query_row("PRAGMA journal_mode", [], |r| r.get(0))
        .unwrap();
    assert_eq!(journal.to_lowercase(), "wal");

    let fk: i64 = db
        .conn()
        .query_row("PRAGMA foreign_keys", [], |r| r.get(0))
        .unwrap();
    assert_eq!(fk, 1, "foreign_keys must be ON");
}
