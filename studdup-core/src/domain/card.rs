//! `Card` — the unit of study — and `LeitnerItem` (front/back content for Leitner cards).

use serde::{Deserialize, Serialize};

use crate::domain::date::Date;
use crate::domain::enums::{Method, PomodoroRhythm, Stage, Technique};

/// A study card. Extends the C++ `Card` with the method/technique/session-length axes.
/// Column names shared with the C++ schema are preserved by the repository layer.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Card {
    pub id: i64,
    pub title: String,
    pub content_link: String,
    pub review_link: String,
    /// The study method — fixed at creation (AD-001). Defaults to spaced on migration.
    pub method: Method,
    /// Optional technique; `None` = no technique.
    pub technique: Option<Technique>,
    /// Estimated session length in minutes (TECH-EST); `None` when there is no technique.
    pub est_minutes: Option<u16>,
    /// Only set when `technique == Pomodoro`.
    pub pomodoro: Option<PomodoroRhythm>,
    /// Spaced-repetition anchor (AD-003); unused for exam cards.
    pub start_date: Date,
    /// Current ladder stage (spaced only).
    pub current_stage: Stage,
    /// Set when `method == ExamPrep`.
    pub exam_id: Option<i64>,
    pub created_at: Date,
    pub last_completed_at: Option<Date>,
    pub archived: bool,
}

/// A Leitner box item (front/back), scoped to a Leitner-technique card (TECH-08).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LeitnerItem {
    pub id: i64,
    pub card_id: i64,
    pub front: String,
    pub back: String,
    pub box_no: u8,
    pub due_date: Date,
}
