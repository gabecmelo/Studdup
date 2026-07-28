//! Database file-path resolution — a port of the C++ `main.cpp::defaultDbPath`.
//!
//! Resolves the platform user-data location for `srs.db`, creates the directory, and — on the
//! first run after the rewrite — copies a legacy relative `data/srs.db` into the new location
//! exactly once (MIG-01: the same file is opened rather than a fresh one being created).

use std::path::PathBuf;

/// The user-data path for the Studdup database:
/// - Windows: `%APPDATA%/studdup/srs.db`
/// - Unix: `$XDG_DATA_HOME/studdup/srs.db`, else `~/.local/share/studdup/srs.db`
///
/// Creates the parent directory. When a legacy `data/srs.db` exists and the new location does
/// not, copies it over once. Falls back to a relative `data/srs.db` when no user-data directory
/// can be resolved (mirrors the C++ fallback).
pub fn default_db_path() -> PathBuf {
    let Some(dir) = user_data_dir() else {
        return relative_fallback();
    };
    if std::fs::create_dir_all(&dir).is_err() {
        return relative_fallback();
    }
    let new_path = dir.join("srs.db");

    // One-time migration: copy the old relative DB to the new location on first run (MIG-01).
    let old_path = PathBuf::from("data").join("srs.db");
    if old_path.exists() && !new_path.exists() {
        let _ = std::fs::copy(&old_path, &new_path);
    }
    new_path
}

/// The last-resort relative location used when there is no resolvable user-data directory.
fn relative_fallback() -> PathBuf {
    let dir = PathBuf::from("data");
    let _ = std::fs::create_dir_all(&dir);
    dir.join("srs.db")
}

#[cfg(windows)]
fn user_data_dir() -> Option<PathBuf> {
    match std::env::var_os("APPDATA") {
        Some(v) if !v.is_empty() => Some(PathBuf::from(v).join("studdup")),
        _ => None,
    }
}

#[cfg(not(windows))]
fn user_data_dir() -> Option<PathBuf> {
    if let Some(xdg) = std::env::var_os("XDG_DATA_HOME").filter(|v| !v.is_empty()) {
        return Some(PathBuf::from(xdg).join("studdup"));
    }
    match std::env::var_os("HOME").filter(|v| !v.is_empty()) {
        Some(home) => Some(
            PathBuf::from(home)
                .join(".local")
                .join("share")
                .join("studdup"),
        ),
        None => None,
    }
}
