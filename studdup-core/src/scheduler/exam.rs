//! Exam-prep scheduling (AD-005, C1 hybrid): a back-loaded session distribution that is
//! **materialized once** at card creation and never recomputed (AD-010 / EXAM-02).
//!
//! `distribute` computes the session offsets from today to the exam date; the repository stores
//! the resulting dates as `ExamSession` rows. The scheduler reads those stored dates — it never
//! re-derives them — so the study plan cannot silently shift.

use crate::domain::{Date, Exam, ExamSession};

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

/// Result of completing an exam session: the updated session set and whether the card is now
/// fully studied (the last session was just completed → the card should be archived, EXAM-03).
#[derive(Debug, Clone, PartialEq)]
pub struct SessionAdvance {
    pub sessions: Vec<ExamSession>,
    /// `true` when there are no remaining uncompleted sessions after this completion.
    pub archived: bool,
}

/// Index of the current cursor session: the uncompleted session with the smallest `seq`.
/// `None` when every session is already completed. Session order is defined by `seq`, not
/// by vector position, so this is robust to storage order.
fn cursor_index(sessions: &[ExamSession]) -> Option<usize> {
    sessions
        .iter()
        .enumerate()
        .filter(|(_, s)| s.completed_at.is_none())
        .min_by_key(|(_, s)| s.seq)
        .map(|(i, _)| i)
}

/// Due date of an exam card = the due date of its current cursor session (the date of the next
/// session to study). `None` when all sessions are completed. Reads the stored, materialized
/// dates — never recomputes them (AD-010).
pub fn session_due_date(sessions: &[ExamSession]) -> Option<Date> {
    cursor_index(sessions).map(|i| sessions[i].due_date)
}

/// Completed / total session counts for an exam card (drives the progress display, EXAM-01.6).
pub fn session_progress(sessions: &[ExamSession]) -> (usize, usize) {
    let completed = sessions.iter().filter(|s| s.completed_at.is_some()).count();
    (completed, sessions.len())
}

/// Complete the current cursor session (dated `today`) and advance the cursor. When the
/// completed session was the last one, `archived` is `true` (EXAM-03: last session → done +
/// archived). A no-op returning `archived = true` when everything is already completed.
pub fn mark_session_completed(mut sessions: Vec<ExamSession>, today: Date) -> SessionAdvance {
    match cursor_index(&sessions) {
        Some(i) => {
            sessions[i].completed_at = Some(today);
            let archived = cursor_index(&sessions).is_none();
            SessionAdvance { sessions, archived }
        }
        None => SessionAdvance {
            sessions,
            archived: true,
        },
    }
}

/// Postpone an exam card by shifting **only its current cursor session** `days` forward
/// (design: "exam shifts the current session date"); already-completed and future sessions are
/// untouched. A no-op when all sessions are completed.
pub fn postpone_session(mut sessions: Vec<ExamSession>, days: i64) -> Vec<ExamSession> {
    if let Some(i) = cursor_index(&sessions) {
        sessions[i].due_date = sessions[i].due_date.add_days(days);
    }
    sessions
}

/// Whether an exam has passed its date and should be concluded (EXAM-02.5): the exam is not
/// already concluded and `today` is strictly after the exam date. On the exam date itself the
/// final session is still due, so the exam is not yet concluded.
pub fn should_conclude(exam: &Exam, today: Date) -> bool {
    !exam.concluded && today > exam.exam_date
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

    // ---- T9: session advancement / postpone / conclusion ----

    /// Build a session set for `card_id` from `(seq, due, completed)` triples.
    fn sessions(specs: &[(u16, Date, Option<Date>)]) -> Vec<ExamSession> {
        specs
            .iter()
            .enumerate()
            .map(|(i, &(seq, due, completed))| ExamSession {
                id: i as i64 + 1,
                card_id: 42,
                seq,
                due_date: due,
                completed_at: completed,
            })
            .collect()
    }

    /// A fresh 3-session set at today, +5, +10 (materialized once).
    fn three_sessions(today: Date) -> Vec<ExamSession> {
        sessions(&[
            (0, today, None),
            (1, today.add_days(5), None),
            (2, today.add_days(10), None),
        ])
    }

    /// The cursor's due date is the first uncompleted session; `None` once all are done.
    #[test]
    fn session_due_date_tracks_the_cursor() {
        let today = ymd(2026, 5, 1);
        let s = three_sessions(today);
        assert_eq!(session_due_date(&s), Some(today));

        // Complete the first → cursor moves to the second session's date.
        let s = mark_session_completed(s, today).sessions;
        assert_eq!(session_due_date(&s), Some(today.add_days(5)));

        // Complete the rest → no cursor, no due date.
        let s = mark_session_completed(s, today.add_days(5)).sessions;
        let done = mark_session_completed(s, today.add_days(10));
        assert_eq!(session_due_date(&done.sessions), None);
    }

    /// Completing sessions advances the cursor one at a time; only the last completion archives.
    #[test]
    fn completing_last_session_archives_the_card() {
        let today = ymd(2026, 5, 1);
        let s = three_sessions(today);

        let step1 = mark_session_completed(s, today);
        assert!(!step1.archived, "1 of 3 completed — not yet archived");
        assert_eq!(step1.sessions[0].completed_at, Some(today));
        assert_eq!(session_progress(&step1.sessions), (1, 3));

        let step2 = mark_session_completed(step1.sessions, today.add_days(5));
        assert!(!step2.archived, "2 of 3 completed — not yet archived");
        assert_eq!(session_progress(&step2.sessions), (2, 3));

        let step3 = mark_session_completed(step2.sessions, today.add_days(10));
        assert!(step3.archived, "last session completed — card archived");
        assert_eq!(session_progress(&step3.sessions), (3, 3));
        assert_eq!(step3.sessions[2].completed_at, Some(today.add_days(10)));
    }

    /// A single-session exam (S=0) archives on its first and only completion.
    #[test]
    fn single_session_archives_immediately() {
        let today = ymd(2026, 5, 1);
        let s = sessions(&[(0, today, None)]);
        let done = mark_session_completed(s, today);
        assert!(done.archived);
        assert_eq!(session_due_date(&done.sessions), None);
    }

    /// Completing when everything is already done is a no-op that reports archived.
    #[test]
    fn mark_completed_on_finished_set_is_noop() {
        let today = ymd(2026, 5, 1);
        let s = sessions(&[(0, today, Some(today))]);
        let out = mark_session_completed(s.clone(), today.add_days(1));
        assert_eq!(out.sessions, s, "already-completed sessions unchanged");
        assert!(out.archived);
    }

    /// Postpone shifts only the current cursor session; completed and later sessions stay put.
    #[test]
    fn postpone_shifts_only_the_current_session() {
        let today = ymd(2026, 5, 1);
        // First session already completed; cursor is the +5 one.
        let s = sessions(&[
            (0, today, Some(today)),
            (1, today.add_days(5), None),
            (2, today.add_days(10), None),
        ]);
        let shifted = postpone_session(s, 3);
        assert_eq!(shifted[0].due_date, today, "completed session untouched");
        assert_eq!(shifted[0].completed_at, Some(today));
        assert_eq!(shifted[1].due_date, today.add_days(8), "cursor moved +3");
        assert_eq!(
            shifted[2].due_date,
            today.add_days(10),
            "later session untouched"
        );
        // Cursor due date reflects the shift.
        assert_eq!(session_due_date(&shifted), Some(today.add_days(8)));
    }

    /// Postpone on a fully-completed set is a no-op.
    #[test]
    fn postpone_on_finished_set_is_noop() {
        let today = ymd(2026, 5, 1);
        let s = sessions(&[(0, today, Some(today))]);
        assert_eq!(postpone_session(s.clone(), 5), s);
    }

    /// An exam concludes only once its date has strictly passed and it isn't already concluded.
    #[test]
    fn should_conclude_after_date_passes() {
        let exam_date = ymd(2026, 6, 1);
        let exam = Exam {
            id: 1,
            name: "Cálculo".to_string(),
            exam_date,
            created_at: ymd(2026, 5, 1),
            concluded: false,
        };
        assert!(
            !should_conclude(&exam, exam_date.add_days(-1)),
            "before date"
        );
        assert!(
            !should_conclude(&exam, exam_date),
            "on the date: last session due"
        );
        assert!(
            should_conclude(&exam, exam_date.add_days(1)),
            "day after: concluded"
        );

        // An already-concluded exam never re-concludes.
        let concluded = Exam {
            concluded: true,
            ..exam
        };
        assert!(!should_conclude(&concluded, exam_date.add_days(30)));
    }
}
