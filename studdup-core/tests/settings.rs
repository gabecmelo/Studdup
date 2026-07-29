//! T31 — settings key/value store integration tests (TECH-09.5 / AD-010): the global-defaults
//! round-trip through the `core::api` facade, the missing-key case, and overwrite semantics.

use studdup_core::api::{get_setting, set_setting};
use studdup_core::repository::Db;

/// A fresh in-memory DB with the full schema (includes the `settings` table).
fn db() -> Db {
    let db = Db::open_in_memory().unwrap();
    db.create_schema().unwrap();
    db
}

#[test]
fn set_then_get_round_trips_the_value() {
    let db = db();
    set_setting(db.conn(), "default_est.Pomodoro", "50").unwrap();
    assert_eq!(
        get_setting(db.conn(), "default_est.Pomodoro").unwrap(),
        Some("50".to_string()),
    );
}

#[test]
fn get_missing_key_is_none() {
    let db = db();
    assert_eq!(get_setting(db.conn(), "never.written").unwrap(), None);
}

#[test]
fn set_overwrites_the_existing_value() {
    let db = db();
    set_setting(db.conn(), "default_est.Feynman", "20").unwrap();
    set_setting(db.conn(), "default_est.Feynman", "35").unwrap();
    assert_eq!(
        get_setting(db.conn(), "default_est.Feynman").unwrap(),
        Some("35".to_string()),
        "second write replaces the first (upsert), not a duplicate row",
    );
}

#[test]
fn distinct_keys_are_independent() {
    let db = db();
    set_setting(db.conn(), "default_est.ActiveRecall", "20").unwrap();
    set_setting(db.conn(), "default_est.Leitner", "15").unwrap();
    assert_eq!(
        get_setting(db.conn(), "default_est.ActiveRecall").unwrap(),
        Some("20".to_string()),
    );
    assert_eq!(
        get_setting(db.conn(), "default_est.Leitner").unwrap(),
        Some("15".to_string()),
    );
}
