//! Shared helpers for the repository integration tests: unique temp DB paths with cleanup.

#![allow(dead_code)] // not every test binary uses every helper

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU32, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

use studdup_core::domain::{Card, Date, Method, Stage};

static COUNTER: AtomicU32 = AtomicU32::new(0);

/// A temp database file path that is deleted (with its `-wal`/`-shm` siblings) on drop.
pub struct TempDb {
    pub path: PathBuf,
}

impl TempDb {
    pub fn new() -> TempDb {
        let n = COUNTER.fetch_add(1, Ordering::Relaxed);
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let pid = std::process::id();
        let mut path = std::env::temp_dir();
        path.push(format!("studdup_test_{pid}_{nanos}_{n}.db"));
        TempDb { path }
    }

    pub fn path(&self) -> &Path {
        &self.path
    }
}

impl Default for TempDb {
    fn default() -> Self {
        TempDb::new()
    }
}

impl Drop for TempDb {
    fn drop(&mut self) {
        for suffix in ["", "-wal", "-shm"] {
            let p = PathBuf::from(format!("{}{}", self.path.display(), suffix));
            let _ = std::fs::remove_file(p);
        }
    }
}

/// A valid `Date` shorthand for tests.
pub fn ymd(y: i32, m: u8, d: u8) -> Date {
    Date::from_ymd(y, m, d).unwrap()
}

/// A minimal spaced card (id 0 — assigned by the DB on insert). Callers tweak fields as needed.
pub fn sample_card(title: &str) -> Card {
    Card {
        id: 0,
        title: title.to_string(),
        content_link: String::new(),
        review_link: String::new(),
        method: Method::SpacedRepetition,
        technique: None,
        est_minutes: None,
        pomodoro: None,
        start_date: ymd(2026, 4, 29),
        current_stage: Stage::Day0,
        exam_id: None,
        created_at: ymd(2026, 4, 29),
        last_completed_at: None,
        archived: false,
    }
}
