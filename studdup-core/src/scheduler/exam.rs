//! Exam-prep scheduling (AD-005, C1 hybrid): a back-loaded session distribution that is
//! **materialized once** at card creation and never recomputed (AD-010 / EXAM-02).
//!
//! `distribute` computes the session offsets from today to the exam date; the repository stores
//! the resulting dates as `ExamSession` rows. The scheduler reads those stored dates — it never
//! re-derives them — so the study plan cannot silently shift.

use crate::domain::Date;

/// Back-loading exponent from EXAM-02: `offset_i = round(S · (i/(N−1))^EXPONENT)`.
const EXPONENT: f64 = 0.62;

/// Number of sessions `N` for a span of `s` days until the exam (EXAM-02 table).
/// `s <= 0 → 1`; `1–3 → 2`; `4–7 → 3`; `8–20 → 4`; `21–45 → 5`; `> 45 → 6`.
fn session_count(s: i64) -> usize {
    match s {
        i64::MIN..=0 => 1,
        1..=3 => 2,
        4..=7 => 3,
        8..=20 => 4,
        21..=45 => 5,
        _ => 6,
    }
}

/// Enforce strictly-increasing offsets by pushing each duplicate/overlap forward one day
/// (EXAM-02: "duplicate offsets pushed forward by one day"). Input is assumed non-decreasing.
fn push_forward_unique(offsets: &[i64]) -> Vec<i64> {
    let mut out: Vec<i64> = Vec::with_capacity(offsets.len());
    for &raw in offsets {
        let next = match out.last() {
            Some(&prev) if raw <= prev => prev + 1,
            _ => raw,
        };
        out.push(next);
    }
    out
}

/// The materialized session dates for an exam card, from `today` to `exam_date` (EXAM-02).
///
/// `S = exam_date − today`. With `N` sessions, `offset_i = round(S·(i/(N−1))^0.62)` clamped to
/// `S`, then duplicates pushed forward one day. When `S <= 0` (exam is today or past) there is
/// exactly one session dated today (edge case: "target date is today → one session, today").
pub fn distribute(today: Date, exam_date: Date) -> Vec<Date> {
    let s = today.days_until(exam_date); // exam_date - today
    let n = session_count(s);
    if n == 1 {
        return vec![today];
    }
    let denom = (n - 1) as f64;
    let raw: Vec<i64> = (0..n)
        .map(|i| {
            let frac = i as f64 / denom;
            let offset = (s as f64 * frac.powf(EXPONENT)).round() as i64;
            offset.min(s)
        })
        .collect();
    push_forward_unique(&raw)
        .into_iter()
        .map(|off| today.add_days(off))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ymd(y: i32, m: u8, d: u8) -> Date {
        Date::from_ymd(y, m, d).unwrap()
    }

    /// Offsets (days from `today`) of a distribution — the shape the formula produces.
    fn offsets(today: Date, exam: Date) -> Vec<i64> {
        distribute(today, exam)
            .iter()
            .map(|d| today.days_until(*d))
            .collect()
    }

    /// EXAM-03 (mandatory): `S = 30` yields exactly `[0, 13, 20, 25, 30]` — the back-loaded
    /// shape with gaps 13, 7, 5, 5.
    #[test]
    fn s30_yields_back_loaded_offsets() {
        let today = ymd(2026, 5, 1);
        let exam = today.add_days(30);
        assert_eq!(offsets(today, exam), vec![0, 13, 20, 25, 30]);
        // And as concrete dates, first is today, last is the exam date.
        let dates = distribute(today, exam);
        assert_eq!(dates.first().copied(), Some(today));
        assert_eq!(dates.last().copied(), Some(exam));
    }

    /// Edge case: exam date is today (`S = 0`) → exactly one session, dated today.
    #[test]
    fn s0_yields_single_session_today() {
        let today = ymd(2026, 5, 1);
        assert_eq!(distribute(today, today), vec![today]);
        assert_eq!(offsets(today, today), vec![0]);
    }

    /// A past exam date (`S < 0`) also collapses to a single session today (validation rejects
    /// past dates upstream; the scheduler must still be total).
    #[test]
    fn negative_span_yields_single_session_today() {
        let today = ymd(2026, 5, 1);
        let past = today.add_days(-5);
        assert_eq!(distribute(today, past), vec![today]);
    }

    /// The N-table boundaries (EXAM-02): session counts at each range edge.
    #[test]
    fn session_counts_match_table_at_boundaries() {
        let today = ymd(2026, 5, 1);
        let n = |span: i64| distribute(today, today.add_days(span)).len();
        assert_eq!(n(0), 1);
        assert_eq!(n(1), 2);
        assert_eq!(n(3), 2);
        assert_eq!(n(4), 3);
        assert_eq!(n(7), 3);
        assert_eq!(n(8), 4);
        assert_eq!(n(20), 4);
        assert_eq!(n(21), 5);
        assert_eq!(n(45), 5);
        assert_eq!(n(46), 6);
        assert_eq!(n(365), 6);
    }

    /// Every distribution starts at today (offset 0), ends at the exam date (offset S), and is
    /// strictly increasing and back-loaded (gaps never grow as the exam approaches).
    #[test]
    fn distribution_is_bounded_increasing_and_back_loaded() {
        let today = ymd(2026, 5, 1);
        for span in [1, 2, 5, 8, 15, 21, 30, 45, 60, 120] {
            let offs = offsets(today, today.add_days(span));
            assert_eq!(*offs.first().unwrap(), 0, "span {span}: starts today");
            assert_eq!(*offs.last().unwrap(), span, "span {span}: ends on exam");
            for w in offs.windows(2) {
                assert!(w[1] > w[0], "span {span}: strictly increasing: {offs:?}");
            }
            // Back-loaded: consecutive gaps are non-increasing.
            let gaps: Vec<i64> = offs.windows(2).map(|w| w[1] - w[0]).collect();
            for g in gaps.windows(2) {
                assert!(g[1] <= g[0], "span {span}: gaps non-increasing: {gaps:?}");
            }
        }
    }

    /// The duplicate push-forward rule: a non-decreasing input with collisions becomes strictly
    /// increasing, each duplicate nudged forward exactly one day past the previous.
    #[test]
    fn push_forward_resolves_duplicates() {
        assert_eq!(push_forward_unique(&[0, 0, 2, 2, 5]), vec![0, 1, 2, 3, 5]);
        assert_eq!(push_forward_unique(&[0, 1, 1, 1, 4]), vec![0, 1, 2, 3, 4]);
        assert_eq!(push_forward_unique(&[0, 3, 5, 7]), vec![0, 3, 5, 7]); // no dups untouched
        assert_eq!(push_forward_unique(&[2, 2, 2]), vec![2, 3, 4]);
        assert_eq!(push_forward_unique(&[]), Vec::<i64>::new());
    }

    /// `session_count` maps spans to the EXAM-02 table exactly (direct unit of the private fn).
    #[test]
    fn session_count_table() {
        assert_eq!(session_count(-10), 1);
        assert_eq!(session_count(0), 1);
        assert_eq!(session_count(1), 2);
        assert_eq!(session_count(3), 2);
        assert_eq!(session_count(4), 3);
        assert_eq!(session_count(7), 3);
        assert_eq!(session_count(8), 4);
        assert_eq!(session_count(20), 4);
        assert_eq!(session_count(21), 5);
        assert_eq!(session_count(45), 5);
        assert_eq!(session_count(46), 6);
        assert_eq!(session_count(1000), 6);
    }
}
