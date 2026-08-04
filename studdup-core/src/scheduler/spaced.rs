//! Spaced-repetition scheduling — a 1:1 port of the C++ `srs::Scheduler` (AD-003).
//!
//! The stage-as-offset invariant means `due_date(card) == card.start_date + stage`; there is
//! no stored "next due date" that can desynchronize. Every operation re-anchors `start_date`
//! while preserving that invariant. Functions are pure: they take a `Card` by value and return
//! the updated `Card` (or a boolean/day-count query), mirroring the C++ signatures exactly.

use crate::domain::{next_stage, Card, Date, Stage};

/// Due date of a spaced card: `start_date + stage offset` (AD-003).
/// Port of C++ `Scheduler::dueDate`.
pub fn due_date(c: &Card) -> Date {
    c.start_date.add_days(c.current_stage.offset() as i64)
}

/// True when the card is due today or overdue (`due <= today`) and not archived.
/// Port of C++ `Scheduler::isDueToday`. Overdue cards count as due today (the `<=`).
pub fn is_due_today(c: &Card, today: Date) -> bool {
    !c.archived && due_date(c) <= today
}

/// True when the card's due date is exactly tomorrow (`due == today + 1`) and not archived.
/// Port of C++ `Scheduler::isDueTomorrow`. Uses `==` — an overdue card is never "tomorrow".
pub fn is_due_tomorrow(c: &Card, today: Date) -> bool {
    !c.archived && due_date(c) == today.add_days(1)
}

/// True when the card's due date is strictly before today (`due < today`) and not archived.
/// Port of C++ `Scheduler::isOverdue`. Due-today is not overdue.
pub fn is_overdue(c: &Card, today: Date) -> bool {
    !c.archived && due_date(c) < today
}

/// Whole number of days overdue, or `0` when due today, in the future, or archived.
/// Port of C++ `Scheduler::overdueDays`.
pub fn overdue_days(c: &Card, today: Date) -> i64 {
    if c.archived {
        return 0;
    }
    let d = due_date(c).days_until(today); // today - due
    if d > 0 {
        d
    } else {
        0
    }
}

/// Advance to the next ladder stage, anchored to `start_date` (next due = `start_date + next`).
/// Leaving `Day30` transitions to `Done` and sets `archived = true`.
/// Precondition: `!archived && stage != Done`. Port of C++ `Scheduler::markCompleted`.
pub fn mark_completed(mut c: Card, today: Date) -> Card {
    assert!(!c.archived, "mark_completed on an archived card");
    assert!(
        c.current_stage != Stage::Done,
        "mark_completed on a Done card"
    );
    c.current_stage = next_stage(c.current_stage);
    c.last_completed_at = Some(today);
    if c.current_stage == Stage::Done {
        c.archived = true;
    }
    c
}

/// "Restart the study" on an overdue card: keep the stage, force `due == today` by re-anchoring
/// `start_date = today - stage offset`. Port of C++ `Scheduler::restartStudy`.
pub fn restart_study(mut c: Card, today: Date) -> Card {
    c.start_date = today.add_days(-(c.current_stage.offset() as i64));
    c
}

/// "Erase the study": discard progress, treat as a fresh Day 0 study starting today.
/// Port of C++ `Scheduler::eraseStudy`.
pub fn erase_study(mut c: Card, today: Date) -> Card {
    c.start_date = today;
    c.current_stage = Stage::Day0;
    c.archived = false;
    c
}

/// History → board: bring an archived card back as a fresh Day 0 study, clearing the last
/// completion. Port of C++ `Scheduler::reviveFromHistory`.
pub fn revive(mut c: Card, today: Date) -> Card {
    c.start_date = today;
    c.current_stage = Stage::Day0;
    c.archived = false;
    c.last_completed_at = None;
    c
}

/// Shift the due date by `days` without changing stage, by moving `start_date` (preserves the
/// stage-anchor invariant). Port of C++ `Scheduler::postpone`.
pub fn postpone(mut c: Card, days: i64) -> Card {
    c.start_date = c.start_date.add_days(days);
    c
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::Method;

    fn ymd(y: i32, m: u8, d: u8) -> Date {
        Date::from_ymd(y, m, d).unwrap()
    }

    /// Mirror of the C++ `makeCard` test helper: a minimal spaced card at `start`/`stage`.
    fn make_card(start: Date, stage: Stage, archived: bool) -> Card {
        Card {
            id: 0,
            title: String::new(),
            content_link: String::new(),
            review_link: String::new(),
            method: Method::SpacedRepetition,
            technique: None,
            est_minutes: None,
            pomodoro: None,
            start_date: start,
            current_stage: stage,
            exam_id: None,
            created_at: start,
            last_completed_at: None,
            archived,
        }
    }

    fn card(start: Date, stage: Stage) -> Card {
        make_card(start, stage, false)
    }

    // kStart / kToday from test_scheduler.cpp.
    fn k_start() -> Date {
        ymd(2026, 4, 29)
    }
    fn k_today() -> Date {
        ymd(2026, 4, 29)
    }

    // Ported: TEST_CASE("Scheduler::dueDate matches startDate + stage offset").
    #[test]
    fn due_date_matches_start_plus_offset() {
        assert_eq!(due_date(&card(k_start(), Stage::Day0)), ymd(2026, 4, 29));
        assert_eq!(due_date(&card(k_start(), Stage::Day1)), ymd(2026, 4, 30));
        assert_eq!(due_date(&card(k_start(), Stage::Day2)), ymd(2026, 5, 1));
        assert_eq!(due_date(&card(k_start(), Stage::Day5)), ymd(2026, 5, 4));
        assert_eq!(due_date(&card(k_start(), Stage::Day15)), ymd(2026, 5, 14));
        assert_eq!(due_date(&card(k_start(), Stage::Day30)), ymd(2026, 5, 29));
    }

    // Ported: TEST_CASE("Scheduler::isDueToday").
    #[test]
    fn is_due_today_includes_overdue() {
        assert!(is_due_today(&card(k_start(), Stage::Day0), k_today()));
        assert!(!is_due_today(&card(k_start(), Stage::Day1), k_today()));
        let yesterday = k_today().add_days(-1);
        assert!(is_due_today(&card(yesterday, Stage::Day0), k_today()));
    }

    // Ported: TEST_CASE("Scheduler::isDueTomorrow").
    #[test]
    fn is_due_tomorrow_is_exact() {
        assert!(is_due_tomorrow(&card(k_start(), Stage::Day1), k_today()));
        assert!(!is_due_tomorrow(&card(k_start(), Stage::Day0), k_today()));
        assert!(!is_due_tomorrow(&card(k_start(), Stage::Day2), k_today()));
    }

    /// Overdue-in-Hoje (`<=`) vs tomorrow (`==`) asymmetry: an overdue card is "due today"
    /// but is never "due tomorrow" (Done-when criterion for T7).
    #[test]
    fn overdue_is_today_never_tomorrow() {
        let three_days_ago = k_today().add_days(-3);
        let overdue = card(three_days_ago, Stage::Day0); // due 3 days before today
        assert!(is_due_today(&overdue, k_today()));
        assert!(!is_due_tomorrow(&overdue, k_today()));
        // And a card genuinely due tomorrow is not "due today".
        let tomorrow_card = card(k_today(), Stage::Day1); // due == today + 1
        assert!(is_due_tomorrow(&tomorrow_card, k_today()));
        assert!(!is_due_today(&tomorrow_card, k_today()));
    }

    // Ported: TEST_CASE("Scheduler::isOverdue").
    #[test]
    fn is_overdue_excludes_due_today_and_future() {
        assert!(!is_overdue(&card(k_start(), Stage::Day0), k_today())); // due today
        let yesterday = ymd(2026, 4, 28);
        assert!(is_overdue(&card(yesterday, Stage::Day0), k_today()));
        // "today" earlier than due → future, not overdue.
        assert!(!is_overdue(
            &card(k_start(), Stage::Day0),
            k_today().add_days(-1)
        ));
    }

    // Ported: TEST_CASE("Scheduler::overdueDays").
    #[test]
    fn overdue_days_counts_whole_days() {
        assert_eq!(overdue_days(&card(k_start(), Stage::Day0), k_today()), 0); // due today
        let three_days_ago = k_today().add_days(-3);
        assert_eq!(
            overdue_days(&card(three_days_ago, Stage::Day0), k_today()),
            3
        );
    }

    /// An archived card is never overdue and reports 0 overdue days.
    #[test]
    fn archived_card_never_due_or_overdue() {
        let c = make_card(k_today().add_days(-10), Stage::Day0, true);
        assert!(!is_due_today(&c, k_today()));
        assert!(!is_overdue(&c, k_today()));
        assert_eq!(overdue_days(&c, k_today()), 0);
    }

    // Ported: TEST_CASE("Scheduler::markCompleted advances each stage").
    #[test]
    fn mark_completed_advances_each_stage() {
        let start = ymd(2026, 4, 29);
        let steps = [
            (Stage::Day0, Stage::Day1, ymd(2026, 4, 30)),
            (Stage::Day1, Stage::Day2, ymd(2026, 5, 1)),
            (Stage::Day2, Stage::Day5, ymd(2026, 5, 4)),
            (Stage::Day5, Stage::Day15, ymd(2026, 5, 14)),
            (Stage::Day15, Stage::Day30, ymd(2026, 5, 29)),
        ];
        for (from, to, expected_due) in steps {
            let updated = mark_completed(card(start, from), k_today());
            assert_eq!(updated.current_stage, to);
            assert_eq!(due_date(&updated), expected_due);
            assert_eq!(updated.last_completed_at, Some(k_today()));
            assert!(!updated.archived);
        }
    }

    // Ported: TEST_CASE("Scheduler::markCompleted archives on Day30 completion").
    #[test]
    fn mark_completed_archives_on_day30() {
        let updated = mark_completed(card(k_start(), Stage::Day30), k_today());
        assert_eq!(updated.current_stage, Stage::Done);
        assert!(updated.archived);
        assert_eq!(updated.last_completed_at, Some(k_today()));
    }

    // Ported: TEST_CASE("Scheduler::markCompleted startDate is unchanged (anchor invariant)").
    #[test]
    fn mark_completed_keeps_start_date() {
        let updated = mark_completed(card(k_start(), Stage::Day2), k_today());
        assert_eq!(updated.start_date, k_start());
    }

    // Ported: TEST_CASE("Scheduler::restartStudy forces dueDate == today").
    #[test]
    fn restart_study_forces_due_today() {
        let three_days_ago = k_today().add_days(-3);
        let updated = restart_study(card(three_days_ago, Stage::Day1), k_today());
        assert_eq!(updated.current_stage, Stage::Day1);
        assert_eq!(due_date(&updated), k_today());
    }

    // Ported: TEST_CASE("Scheduler::restartStudy keeps same stage").
    #[test]
    fn restart_study_keeps_stage() {
        let updated = restart_study(card(k_start(), Stage::Day5), k_today());
        assert_eq!(updated.current_stage, Stage::Day5);
    }

    // Ported: TEST_CASE("Scheduler::eraseStudy resets to Day0 with today as startDate").
    #[test]
    fn erase_study_resets_to_day0_today() {
        let old_start = ymd(2026, 3, 1);
        let updated = erase_study(card(old_start, Stage::Day15), k_today());
        assert_eq!(updated.current_stage, Stage::Day0);
        assert_eq!(updated.start_date, k_today());
        assert!(!updated.archived);
        assert_eq!(due_date(&updated), k_today());
    }

    // Ported: TEST_CASE("Scheduler::reviveFromHistory resets archived card to Day0").
    #[test]
    fn revive_resets_archived_card_to_day0() {
        let mut c = make_card(k_start(), Stage::Done, true);
        c.last_completed_at = Some(k_start());
        let updated = revive(c, k_today());
        assert_eq!(updated.current_stage, Stage::Day0);
        assert_eq!(updated.start_date, k_today());
        assert!(!updated.archived);
        assert_eq!(updated.last_completed_at, None);
        assert_eq!(due_date(&updated), k_today());
    }

    // Ported: TEST_CASE("Scheduler::postpone shifts dueDate by N days").
    #[test]
    fn postpone_shifts_due_by_n_days() {
        let updated = postpone(card(k_start(), Stage::Day2), 3); // due = kStart + 2
        assert_eq!(updated.current_stage, Stage::Day2); // stage unchanged
        assert_eq!(updated.start_date, k_start().add_days(3)); // startDate shifted
        assert_eq!(due_date(&updated), k_start().add_days(5)); // due shifted by 3
    }
}
