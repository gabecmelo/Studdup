//! `HistoryEvent` — the per-card audit trail, extended with method/technique/session payload.

use serde::{Deserialize, Serialize};

use crate::domain::date::Date;
use crate::domain::enums::{Method, Stage, Technique};

/// A recorded card event. `kind` is one of
/// `created | completed | restart | erase | archived | revived`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct HistoryEvent {
    pub id: i64,
    pub card_id: i64,
    pub kind: String,
    pub from_stage: Stage,
    pub to_stage: Stage,
    /// Method in effect at the moment of the event (HIST-04).
    pub method: Method,
    /// Technique in effect at the moment of the event (HIST-04).
    pub technique: Option<Technique>,
    /// Elapsed focused seconds recorded on session completion (TECH-03).
    pub focused_secs: Option<u32>,
    /// Three-point self-rating 0/1/2 (TECH-06).
    pub self_rating: Option<u8>,
    pub when: Date,
}
