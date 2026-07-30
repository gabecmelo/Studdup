//! Leitner box scheduling (AD-012, TECH-08): a pure function deciding an item's next box and due
//! date on review, and a due predicate. Boxes 1–5 map to intervals `[1, 2, 4, 8, 16]` days.
//!
//! A **correct** review promotes the item one box, capped at box 5; a **wrong** review sends it back
//! to box 1. Either way the new due date is `today + interval[new_box]`. A Leitner session then
//! presents only items whose `due_date <= today` ([`leitner_due`]). New items enter box 1 due today
//! (the repository sets that on insert); this module owns only the on-review transition.
//!
//! Kept pure — values in, values out — like `spaced`/`exam`, so the box math is unit-tested on its
//! own and desynchronized state stays unrepresentable.

use crate::domain::Date;

/// The lowest and highest Leitner box (inclusive). Boxes outside this range are clamped.
const MIN_BOX: u8 = 1;
const MAX_BOX: u8 = 5;

/// Review intervals in days, indexed by `box - 1`: box 1 → 1 day, …, box 5 → 16 days (AD-012).
const INTERVALS: [i64; 5] = [1, 2, 4, 8, 16];

/// The interval in days for a box (clamped to the valid 1–5 range for safety).
fn interval_for(box_no: u8) -> i64 {
    let idx = box_no.clamp(MIN_BOX, MAX_BOX) - 1;
    INTERVALS[idx as usize]
}

/// The next state of a Leitner item on review (AD-012, TECH-08.2/3/4): `correct` promotes one box
/// (capped at 5), `wrong` resets to box 1; the new due date is `today + interval[new_box]`.
///
/// Returns `(new_box, due_date)`. The caller persists both.
pub fn leitner_review(box_no: u8, correct: bool, today: Date) -> (u8, Date) {
    let new_box = if correct {
        (box_no + 1).min(MAX_BOX).max(MIN_BOX)
    } else {
        MIN_BOX
    };
    let due = today.add_days(interval_for(new_box));
    (new_box, due)
}

/// Whether an item with the given due date is due in a session started on `today` (TECH-08.4):
/// due when `due_date <= today`.
pub fn leitner_due(due_date: Date, today: Date) -> bool {
    due_date <= today
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ymd(y: i32, m: u8, d: u8) -> Date {
        Date::from_ymd(y, m, d).unwrap()
    }

    /// TECH-08.2: a correct review promotes one box, and the interval grows with the box.
    #[test]
    fn correct_promotes_one_box_with_its_interval() {
        let today = ymd(2026, 5, 1);
        // box 1 → 2, due today + 2 days (interval of box 2).
        assert_eq!(leitner_review(1, true, today), (2, today.add_days(2)));
        // box 2 → 3, due today + 4.
        assert_eq!(leitner_review(2, true, today), (3, today.add_days(4)));
        // box 3 → 4, due today + 8.
        assert_eq!(leitner_review(3, true, today), (4, today.add_days(8)));
        // box 4 → 5, due today + 16.
        assert_eq!(leitner_review(4, true, today), (5, today.add_days(16)));
    }

    /// TECH-08.2: promotion caps at box 5 — a correct review of box 5 stays box 5 (due +16).
    #[test]
    fn correct_caps_at_box_five() {
        let today = ymd(2026, 5, 1);
        assert_eq!(leitner_review(5, true, today), (5, today.add_days(16)));
    }

    /// TECH-08.3 (independent test): a wrong review returns the item to box 1, due the next day.
    #[test]
    fn wrong_resets_to_box_one_due_tomorrow() {
        let today = ymd(2026, 5, 1);
        // From any box, wrong → box 1, due today + 1 (interval of box 1).
        assert_eq!(leitner_review(5, false, today), (1, today.add_days(1)));
        assert_eq!(leitner_review(3, false, today), (1, today.add_days(1)));
        assert_eq!(leitner_review(1, false, today), (1, today.add_days(1)));
    }

    /// TECH-08.4: box intervals are exactly 1, 2, 4, 8, 16 days for boxes 1–5. Promoting from box 1
    /// up the chain lands due today +2, +4, +8, +16 (each step's new box interval).
    #[test]
    fn promotion_chain_matches_the_interval_table() {
        let today = ymd(2026, 5, 1);
        let mut box_no = 1u8;
        let expected_offsets = [2i64, 4, 8, 16, 16]; // box 1→2→3→4→5→(5 capped)
        for expected in expected_offsets {
            let (next, due) = leitner_review(box_no, true, today);
            assert_eq!(due, today.add_days(expected), "box {box_no} correct");
            box_no = next;
        }
        assert_eq!(box_no, 5, "chain settles at the max box");
    }

    /// TECH-08.4: due when `due_date <= today` — past and today are due, the future is not.
    #[test]
    fn due_when_due_date_is_today_or_earlier() {
        let today = ymd(2026, 5, 10);
        assert!(leitner_due(today, today), "due today");
        assert!(leitner_due(today.add_days(-1), today), "overdue");
        assert!(leitner_due(today.add_days(-16), today), "long overdue");
        assert!(!leitner_due(today.add_days(1), today), "tomorrow is not due");
        assert!(!leitner_due(today.add_days(16), today), "far future not due");
    }

    /// A wrong review makes the item due tomorrow, so it is not due in *today's* remaining session
    /// but is due when the next day's session starts (TECH-08.3 + .4 together).
    #[test]
    fn wrong_review_is_not_due_again_today_but_is_tomorrow() {
        let today = ymd(2026, 5, 1);
        let (_box, due) = leitner_review(4, false, today);
        assert!(!leitner_due(due, today), "not due again the same day");
        assert!(leitner_due(due, today.add_days(1)), "due next day");
    }
}
