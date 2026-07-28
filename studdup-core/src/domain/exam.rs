//! `Exam` (name + target date) and its materialized `ExamSession` schedule (C1, AD-005).

use serde::{Deserialize, Serialize};

use crate::domain::date::Date;

/// A first-class exam grouping its cards (AD-005).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Exam {
    pub id: i64,
    pub name: String,
    pub exam_date: Date,
    pub created_at: Date,
    pub concluded: bool,
}

/// A materialized study session for an exam card — frozen at card creation, never recomputed.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ExamSession {
    pub id: i64,
    pub card_id: i64,
    pub seq: u16,
    pub due_date: Date,
    pub completed_at: Option<Date>,
}
