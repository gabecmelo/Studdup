//! T14 — forward migration against a reconstructed real C++ `srs.db`.
//!
//! The fixture is the exact old schema from `src/DatabaseManager.cpp` (`cards` + `history`,
//! `user_version = 0`) with representative rows. That reconstructed DB IS the "real C++ srs.db"
//! for test purposes — the user's real database is never touched.

mod common;

use common::TempDb;
use rusqlite::Connection;
use studdup_core::domain::{Method, Stage};
use studdup_core::repository::cards::{load_active, load_archived};
use studdup_core::repository::events::{load_history, HistoryFilter};
use studdup_core::repository::migration::migrate;
use studdup_core::repository::Db;

/// The exact C++ `cards` + `history` DDL (DatabaseManager.cpp::migrate) at `user_version = 0`,
/// with one active card, one archived card and one history event.
fn build_cpp_db(path: &std::path::Path) {
    let conn = Connection::open(path).unwrap();
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
        CREATE TABLE history (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id     INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
            event_type  TEXT NOT NULL,
            from_stage  INTEGER,
            to_stage    INTEGER,
            when_date   TEXT NOT NULL
        );
        CREATE INDEX idx_cards_archived ON cards(archived);
        CREATE INDEX idx_history_card   ON history(card_id);

        INSERT INTO cards (title, content_link, review_link, start_date, stage, archived, created_at, last_completed_at)
        VALUES ('Integrais', 'https://ex.com/c', 'https://ex.com/r', '2026-04-29', 5, 0, '2026-04-20', '2026-05-01');
        INSERT INTO cards (title, content_link, review_link, start_date, stage, archived, created_at, last_completed_at)
        VALUES ('Derivadas', '', '', '2026-03-01', -1, 1, '2026-02-01', '2026-04-15');

        INSERT INTO history (card_id, event_type, from_stage, to_stage, when_date)
        VALUES (1, 'completed', 2, 5, '2026-05-01');
        ",
    )
    .unwrap();
    // user_version defaults to 0 (a C++ DB). Close the connection so WAL/handles are released.
    drop(conn);
}

#[test]
fn migrates_cpp_db_preserving_fields_and_defaulting_method() {
    let temp = TempDb::new();
    build_cpp_db(&temp.path);

    let db = Db::open(&temp.path).unwrap();
    let report = migrate(&db).unwrap();

    assert!(report.ran);
    assert_eq!(report.from_version, 0);
    assert_eq!(report.to_version, 3);

    // A backup file was written and exists on disk (MIG-03).
    let backup = report.backup_path.expect("a backup path");
    assert!(backup.exists(), "backup file should exist at {backup:?}");
    let _ = std::fs::remove_file(&backup); // tidy up the backup we created

    // The active card: method defaulted to spaced, technique NULL, all original fields intact.
    let active = load_active(db.conn(), Method::SpacedRepetition).unwrap();
    assert_eq!(active.len(), 1);
    let card = &active[0];
    assert_eq!(card.id, 1);
    assert_eq!(card.title, "Integrais");
    assert_eq!(card.content_link, "https://ex.com/c");
    assert_eq!(card.review_link, "https://ex.com/r");
    assert_eq!(card.start_date.to_iso(), "2026-04-29");
    assert_eq!(card.current_stage, Stage::Day5);
    assert_eq!(card.created_at.to_iso(), "2026-04-20");
    assert_eq!(
        card.last_completed_at.map(|d| d.to_iso()),
        Some("2026-05-01".to_string())
    );
    assert!(!card.archived);
    assert_eq!(card.method, Method::SpacedRepetition); // MIG-02 default
    assert_eq!(card.technique, None); // MIG-02 default
    assert_eq!(card.exam_id, None);

    // The archived card is preserved and loads under archived.
    let archived = load_archived(db.conn(), Method::SpacedRepetition).unwrap();
    assert_eq!(archived.len(), 1);
    assert_eq!(archived[0].title, "Derivadas");
    assert_eq!(archived[0].current_stage, Stage::Done);
    assert!(archived[0].archived);
    assert_eq!(archived[0].method, Method::SpacedRepetition);

    // The history event is preserved and got method='spaced', technique NULL (MIG-02).
    let events = load_history(db.conn(), &HistoryFilter::all()).unwrap();
    assert_eq!(events.len(), 1);
    assert_eq!(events[0].kind, "completed");
    assert_eq!(events[0].from_stage, Stage::Day2);
    assert_eq!(events[0].to_stage, Stage::Day5);
    assert_eq!(events[0].method, Method::SpacedRepetition);
    assert_eq!(events[0].technique, None);
}

#[test]
fn migration_is_idempotent() {
    let temp = TempDb::new();
    build_cpp_db(&temp.path);

    let db = Db::open(&temp.path).unwrap();
    let first = migrate(&db).unwrap();
    assert!(first.ran);
    if let Some(b) = &first.backup_path {
        let _ = std::fs::remove_file(b);
    }

    // Second run: detected as already applied, no-op, no new backup (MIG-04).
    let second = migrate(&db).unwrap();
    assert!(!second.ran);
    assert_eq!(second.from_version, 3);
    assert_eq!(second.to_version, 3);
    assert_eq!(second.backup_path, None);

    // Data is unchanged after the second (no-op) run.
    let active = load_active(db.conn(), Method::SpacedRepetition).unwrap();
    assert_eq!(active.len(), 1);
    assert_eq!(active[0].title, "Integrais");
}

#[test]
fn migrated_schema_matches_a_fresh_install() {
    // Migrate a C++ DB…
    let migrated_temp = TempDb::new();
    build_cpp_db(&migrated_temp.path);
    let migrated = Db::open(&migrated_temp.path).unwrap();
    if let Some(b) = migrate(&migrated).unwrap().backup_path {
        let _ = std::fs::remove_file(b);
    }

    // …and create a fresh DB; both must expose the same cards/history columns.
    let fresh_temp = TempDb::new();
    let fresh = Db::open(&fresh_temp.path).unwrap();
    fresh.create_schema().unwrap();

    for table in [
        "cards",
        "history",
        "exams",
        "exam_sessions",
        "leitner_items",
        "settings",
        "attempts",
    ] {
        assert_eq!(
            columns(migrated.conn(), table),
            columns(fresh.conn(), table),
            "column set mismatch for table {table}"
        );
    }
}

/// Ordered column names of a table.
fn columns(conn: &Connection, table: &str) -> Vec<String> {
    let mut stmt = conn
        .prepare(&format!("PRAGMA table_info({table})"))
        .unwrap();
    let cols = stmt
        .query_map([], |r| r.get::<_, String>(1))
        .unwrap()
        .map(Result::unwrap)
        .collect();
    cols
}

/// Whether a table exists in the main schema.
fn has_table(conn: &Connection, name: &str) -> bool {
    conn.query_row(
        "SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = ?1",
        [name],
        |r| r.get::<_, i64>(0),
    )
    .unwrap()
        > 0
}

/// A v1 database (schema before AD-011) upgrades to v2 by gaining the `attempts` table, and a
/// second run is a no-op that adds nothing (idempotent v1 → v2).
#[test]
fn upgrades_v1_to_v2_adding_attempts_idempotently() {
    let temp = TempDb::new();
    let db = Db::open(&temp.path).unwrap();
    db.create_schema().unwrap();

    // Simulate a real v1 DB: drop the v2-only `attempts` table and roll the version back to 1.
    db.conn().execute_batch("DROP TABLE attempts;").unwrap();
    db.conn().pragma_update(None, "user_version", 1).unwrap();
    assert!(
        !has_table(db.conn(), "attempts"),
        "precondition: v1 has no attempts table"
    );

    // v1 → v2: a `cards` table exists, so a backup is written before the upgrade.
    let report = migrate(&db).unwrap();
    if let Some(b) = &report.backup_path {
        let _ = std::fs::remove_file(b);
    }
    assert!(report.ran);
    assert_eq!(report.from_version, 1);
    assert_eq!(report.to_version, 3);
    assert!(
        has_table(db.conn(), "attempts"),
        "v2 gained the attempts table"
    );

    // Re-running is a detected no-op: nothing added, no new backup (idempotent).
    let cols_before = columns(db.conn(), "attempts");
    let again = migrate(&db).unwrap();
    assert!(!again.ran);
    assert_eq!(again.from_version, 3);
    assert_eq!(again.to_version, 3);
    assert_eq!(again.backup_path, None);
    assert_eq!(
        columns(db.conn(), "attempts"),
        cols_before,
        "no schema change on re-run"
    );
}

#[test]
fn fresh_empty_db_gets_full_schema_without_backup() {
    // A brand-new empty file: migrate should create the schema and need no backup.
    let temp = TempDb::new();
    let db = Db::open(&temp.path).unwrap();
    let report = migrate(&db).unwrap();
    assert!(report.ran);
    assert_eq!(report.backup_path, None);
    assert_eq!(report.to_version, 3);

    // All tables exist; a card can be loaded (empty) without error.
    assert_eq!(
        load_active(db.conn(), Method::SpacedRepetition)
            .unwrap()
            .len(),
        0
    );
}
