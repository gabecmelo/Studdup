//! `Attempt` — a free-text answer the user writes from memory during an Active Recall or Feynman
//! session (TECH-04/05). Persisted in its own `attempts` table (AD-011) and shown per card in
//! reverse-chronological order (TECH-04.4).

use serde::{Deserialize, Serialize};

use crate::domain::date::Date;

/// Which technique produced a written attempt. Serializes as the DB/wire snake_case string
/// (`"active_recall"` / `"feynman"`), matching the `attempts.kind` column and the frontend value.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AttemptKind {
    ActiveRecall,
    Feynman,
}

/// One written attempt on a card.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Attempt {
    pub id: i64,
    pub card_id: i64,
    pub kind: AttemptKind,
    pub text: String,
    pub created_at: Date,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn attempt_kind_serializes_as_snake_case() {
        assert_eq!(
            serde_json::to_string(&AttemptKind::ActiveRecall).unwrap(),
            "\"active_recall\""
        );
        assert_eq!(
            serde_json::to_string(&AttemptKind::Feynman).unwrap(),
            "\"feynman\""
        );
    }

    #[test]
    fn attempt_round_trips_through_json() {
        let attempt = Attempt {
            id: 3,
            card_id: 7,
            kind: AttemptKind::Feynman,
            text: "Explico como se fosse a alguém do zero.".to_string(),
            created_at: Date::from_ymd(2026, 4, 29).unwrap(),
        };
        let back: Attempt =
            serde_json::from_str(&serde_json::to_string(&attempt).unwrap()).unwrap();
        assert_eq!(attempt, back);
    }
}
