//! Pure domain types and the two study vocabularies — no I/O.

pub mod attempt;
pub mod card;
pub mod date;
pub mod enums;
pub mod event;
pub mod exam;

pub use attempt::{Attempt, AttemptKind};
pub use card::{Card, LeitnerItem};
pub use date::Date;
pub use enums::{next_stage, stage_label, Method, PomodoroRhythm, Stage, Technique};
pub use event::HistoryEvent;
pub use exam::{Exam, ExamSession};

#[cfg(test)]
mod serde_tests {
    use super::*;

    fn ymd(y: i32, m: u8, d: u8) -> Date {
        Date::from_ymd(y, m, d).unwrap()
    }

    /// A fully-populated card (every optional set) must survive a JSON round-trip unchanged.
    #[test]
    fn card_round_trips_through_json() {
        let card = Card {
            id: 7,
            title: "Integrais".to_string(),
            content_link: "https://example.com/a".to_string(),
            review_link: "https://example.com/b".to_string(),
            method: Method::SpacedRepetition,
            technique: Some(Technique::Pomodoro),
            est_minutes: Some(25),
            pomodoro: Some(PomodoroRhythm::CLASSIC),
            start_date: ymd(2026, 4, 29),
            current_stage: Stage::Day5,
            exam_id: None,
            created_at: ymd(2026, 4, 20),
            last_completed_at: Some(ymd(2026, 4, 28)),
            archived: false,
        };
        let json = serde_json::to_string(&card).unwrap();
        let back: Card = serde_json::from_str(&json).unwrap();
        assert_eq!(card, back);
    }

    #[test]
    fn exam_and_session_round_trip() {
        let exam = Exam {
            id: 1,
            name: "Cálculo I".to_string(),
            exam_date: ymd(2026, 6, 1),
            created_at: ymd(2026, 5, 1),
            concluded: false,
        };
        let session = ExamSession {
            id: 3,
            card_id: 7,
            seq: 2,
            due_date: ymd(2026, 5, 14),
            completed_at: None,
        };
        assert_eq!(
            exam,
            serde_json::from_str(&serde_json::to_string(&exam).unwrap()).unwrap()
        );
        assert_eq!(
            session,
            serde_json::from_str(&serde_json::to_string(&session).unwrap()).unwrap()
        );
    }

    #[test]
    fn history_event_round_trips_with_new_payload_fields() {
        let ev = HistoryEvent {
            id: 5,
            card_id: 7,
            card_title: None,
            kind: "completed".to_string(),
            from_stage: Stage::Day2,
            to_stage: Stage::Day5,
            method: Method::ExamPrep,
            technique: Some(Technique::ActiveRecall),
            focused_secs: Some(1500),
            self_rating: Some(2),
            when: ymd(2026, 4, 29),
        };
        let back: HistoryEvent =
            serde_json::from_str(&serde_json::to_string(&ev).unwrap()).unwrap();
        assert_eq!(ev, back);
    }

    #[test]
    fn leitner_item_round_trips() {
        let item = LeitnerItem {
            id: 2,
            card_id: 7,
            front: "capital da França".to_string(),
            back: "Paris".to_string(),
            box_no: 1,
            due_date: ymd(2026, 4, 30),
        };
        let back: LeitnerItem =
            serde_json::from_str(&serde_json::to_string(&item).unwrap()).unwrap();
        assert_eq!(item, back);
    }
}
