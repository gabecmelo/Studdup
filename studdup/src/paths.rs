//! Database file-path resolution — a port of the C++ `main.cpp::defaultDbPath`.
//!
//! Resolves the platform user-data location for `srs.db`, creates the directory, and — on the
//! first run after the rewrite — copies a legacy relative `data/srs.db` into the new location
//! exactly once (MIG-01: the same file is opened rather than a fresh one being created).
//!
//! On mobile (Android) the location comes from Tauri's app-private data dir instead; see
//! [`mobile_db_path`], which the setup hook feeds with `app.path().app_data_dir()`.

use std::ffi::OsStr;
use std::path::{Path, PathBuf};

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

/// The mobile (Android) database path: `srs.db` inside the platform's app-private data directory,
/// which Tauri resolves via `app.path().app_data_dir()`. The directory itself is created by the
/// caller (the Tauri setup hook) before this is used.
///
/// Only reached on Android (and in unit tests); allow it to be unused on desktop host builds.
#[cfg_attr(not(target_os = "android"), allow(dead_code))]
pub fn mobile_db_path(dir: &Path) -> PathBuf {
    dir.join("srs.db")
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
        Some(v) if !v.is_empty() => Some(appdata_data_dir(&v)),
        _ => None,
    }
}

/// `%APPDATA%/studdup` — the Windows user-data directory. Pure so the mapping is unit-testable
/// without mutating the process environment.
#[cfg(windows)]
fn appdata_data_dir(appdata: &OsStr) -> PathBuf {
    PathBuf::from(appdata).join("studdup")
}

#[cfg(not(windows))]
fn user_data_dir() -> Option<PathBuf> {
    if let Some(xdg) = std::env::var_os("XDG_DATA_HOME").filter(|v| !v.is_empty()) {
        return Some(xdg_data_dir(&xdg));
    }
    std::env::var_os("HOME")
        .filter(|v| !v.is_empty())
        .map(|home| home_data_dir(&home))
}

/// `$XDG_DATA_HOME/studdup`. Pure so the mapping is unit-testable without env mutation.
#[cfg(not(windows))]
fn xdg_data_dir(xdg: &OsStr) -> PathBuf {
    PathBuf::from(xdg).join("studdup")
}

/// `~/.local/share/studdup`. Pure so the mapping is unit-testable without env mutation.
#[cfg(not(windows))]
fn home_data_dir(home: &OsStr) -> PathBuf {
    PathBuf::from(home)
        .join(".local")
        .join("share")
        .join("studdup")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mobile_db_path_joins_srs_db_under_the_app_data_dir() {
        let dir = Path::new("/data/data/com.studdup.app/files");
        assert_eq!(mobile_db_path(dir), dir.join("srs.db"));
    }

    // Desktop resolver is byte-for-byte unchanged (DATA-03): the env value is mapped to
    // `<value>/studdup` (or `~/.local/share/studdup`) exactly as before. Asserted on the pure
    // mapping helpers so no process env or filesystem is touched.

    #[cfg(windows)]
    #[test]
    fn desktop_windows_path_is_appdata_studdup() {
        let appdata = OsStr::new(r"C:\Users\x\AppData\Roaming");
        assert_eq!(
            appdata_data_dir(appdata),
            PathBuf::from(r"C:\Users\x\AppData\Roaming").join("studdup")
        );
    }

    #[cfg(not(windows))]
    #[test]
    fn desktop_xdg_data_home_path_is_xdg_studdup() {
        assert_eq!(
            xdg_data_dir(OsStr::new("/custom/xdg")),
            PathBuf::from("/custom/xdg/studdup")
        );
    }

    #[cfg(not(windows))]
    #[test]
    fn desktop_home_fallback_path_is_local_share_studdup() {
        assert_eq!(
            home_data_dir(OsStr::new("/home/x")),
            PathBuf::from("/home/x/.local/share/studdup")
        );
    }
}
