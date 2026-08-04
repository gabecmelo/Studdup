//! Key/value settings persistence — the small `settings` table backing the global technique
//! defaults edited in Configurações (TECH-09.5). A generic string key/value store: the UI owns the
//! key namespace (e.g. `default_est.Pomodoro`) and value encoding, keeping the core agnostic to
//! which preferences exist. Global defaults apply only to cards created afterwards (AD-010), so this
//! module just stores and reads values — it never rewrites existing cards.

use rusqlite::{params, Connection};

/// Read a setting by key. `None` when the key has never been written.
pub fn get_setting(conn: &Connection, key: &str) -> rusqlite::Result<Option<String>> {
    let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
    let mut rows = stmt.query_map(params![key], |row| row.get::<_, String>(0))?;
    match rows.next() {
        Some(v) => Ok(Some(v?)),
        None => Ok(None),
    }
}

/// Write a setting, inserting it or overwriting the existing value for `key` (upsert).
pub fn set_setting(conn: &Connection, key: &str, value: &str) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2) \
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )?;
    Ok(())
}
