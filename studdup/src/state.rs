//! Managed Tauri state: the open, migrated database behind a mutex.
//!
//! The database is opened and forward-migrated once at startup, then held behind a `Mutex`
//! (single-user local DB, synchronous rusqlite — design Tech Decisions). Commands lock it per
//! call. If the file cannot be opened or the migration fails, startup surfaces a fatal error and
//! the app never falls back to a blank database (spec edge case / MIG).

use std::fmt;
use std::path::Path;
use std::sync::Mutex;

use studdup_core::repository::migration::{self, MigrationError};
use studdup_core::repository::Db;

/// The app's shared state: the migrated database behind a `Mutex`. Holds the core [`Db`] (which
/// wraps the rusqlite `Connection` plus its path, required by the migration/backup step).
pub struct AppState {
    /// The migrated database, locked per command call by the `commands` module.
    pub db: Mutex<Db>,
}

/// A fatal startup failure — surfaced to the user together with the database path. The app never
/// silently opens an empty database on failure.
#[derive(Debug)]
pub enum StateInitError {
    /// The database file could not be opened (locked / unwritable). Stringified because
    /// `rusqlite::Error` is not a dependency of this crate.
    Open(String),
    /// The forward schema migration failed (backup or SQL step).
    Migrate(MigrationError),
}

impl fmt::Display for StateInitError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            StateInitError::Open(e) => write!(f, "não foi possível abrir o banco de dados: {e}"),
            StateInitError::Migrate(e) => write!(f, "a migração do banco falhou: {e}"),
        }
    }
}

impl std::error::Error for StateInitError {}

/// Open the database at `path`, run the forward migration, and wrap it as managed state. Returns
/// an error (never a blank DB) when the file cannot be opened or the migration fails.
pub fn init_state(path: &Path) -> Result<AppState, StateInitError> {
    let db = Db::open(path).map_err(|e| StateInitError::Open(e.to_string()))?;
    migration::migrate(&db).map_err(StateInitError::Migrate)?;
    Ok(AppState { db: Mutex::new(db) })
}
