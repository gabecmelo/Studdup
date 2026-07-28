//! History event persistence and queries. The event log lives in the C++ `history` table, here
//! extended with the method/technique/session payload (HIST-04). Queries cover per-method history
//! (HIST-01), the unified labeled history (HIST-02) and method/technique filtering (HIST-03).

use rusqlite::types::Value;
use rusqlite::{params, params_from_iter, Connection, Row};

use crate::domain::{HistoryEvent, Method, Technique};
use crate::repository::{
    date_to_db, method_from_db, method_to_db, parse_date, stage_from_db, stage_to_db,
    technique_from_db, technique_to_db,
};

/// Column list shared by the load query and the row mapper.
const SELECT_COLS: &str = "id, card_id, event_type, from_stage, to_stage, when_date, method, \
     technique, focused_secs, self_rating";

/// A history query filter. `method = None` means all methods (the unified view, HIST-02);
/// `technique = Some(_)` narrows to one technique (HIST-03). The default is "everything".
#[derive(Debug, Clone, Default)]
pub struct HistoryFilter {
    pub method: Option<Method>,
    pub technique: Option<Technique>,
}

impl HistoryFilter {
    /// The unified history: every method, every technique (HIST-02).
    pub fn all() -> HistoryFilter {
        HistoryFilter::default()
    }

    /// Per-method history (HIST-01).
    pub fn for_method(method: Method) -> HistoryFilter {
        HistoryFilter {
            method: Some(method),
            technique: None,
        }
    }

    /// Narrow this filter to a technique (HIST-03).
    pub fn with_technique(mut self, technique: Technique) -> HistoryFilter {
        self.technique = Some(technique);
        self
    }
}

/// Record a history event, persisting the full payload (kind, stage transition, method,
/// technique, focused seconds, self-rating). Returns the new event id.
pub fn record_event(conn: &Connection, e: &HistoryEvent) -> rusqlite::Result<i64> {
    conn.execute(
        "INSERT INTO history \
         (card_id, event_type, from_stage, to_stage, when_date, method, technique, \
          focused_secs, self_rating) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            e.card_id,
            e.kind,
            stage_to_db(e.from_stage),
            stage_to_db(e.to_stage),
            date_to_db(e.when),
            method_to_db(e.method),
            e.technique.map(technique_to_db),
            e.focused_secs,
            e.self_rating,
        ],
    )?;
    Ok(conn.last_insert_rowid())
}

/// Load history events matching `filter`, most recent first. Each row is self-labeled with its
/// method and technique (HIST-02/04). The caller derives the result count (HIST-03) from the len.
pub fn load_history(
    conn: &Connection,
    filter: &HistoryFilter,
) -> rusqlite::Result<Vec<HistoryEvent>> {
    let mut conds: Vec<String> = Vec::new();
    let mut vals: Vec<Value> = Vec::new();
    if let Some(m) = filter.method {
        conds.push(format!("method = ?{}", vals.len() + 1));
        vals.push(Value::Text(method_to_db(m).to_string()));
    }
    if let Some(t) = filter.technique {
        conds.push(format!("technique = ?{}", vals.len() + 1));
        vals.push(Value::Text(technique_to_db(t).to_string()));
    }
    let where_clause = if conds.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conds.join(" AND "))
    };
    let sql = format!(
        "SELECT {SELECT_COLS} FROM history {where_clause} ORDER BY when_date DESC, id DESC"
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params_from_iter(vals), row_to_event)?;
    rows.collect()
}

fn row_to_event(row: &Row) -> rusqlite::Result<HistoryEvent> {
    let technique: Option<String> = row.get(7)?;
    Ok(HistoryEvent {
        id: row.get(0)?,
        card_id: row.get(1)?,
        kind: row.get(2)?,
        from_stage: stage_from_db(row.get(3)?),
        to_stage: stage_from_db(row.get(4)?),
        when: parse_date(&row.get::<_, String>(5)?)?,
        method: method_from_db(&row.get::<_, String>(6)?),
        technique: technique_from_db(technique.as_deref()),
        focused_secs: row.get(8)?,
        self_rating: row.get(9)?,
    })
}
