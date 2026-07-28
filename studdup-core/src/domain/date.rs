//! `Date` — a local calendar date, ported from the C++ `Date` onto the vetted `time` crate.
//!
//! The public surface mirrors the C++ type (`today`, `from_ymd`, `from_iso`, `to_iso`,
//! `add_days`, `days_until`, comparisons) and the on-disk ISO string format so the same
//! `srs.db` opens unchanged. Calendar correctness (leap years, month lengths) comes from
//! `time` rather than the hand-rolled C++ serial-day math.
//!
//! Rust makes an invalid date unrepresentable: a `Date` value is always valid, and the fallible
//! parsers return `Option<Date>` (`None` where the C++ code produced an `isValid() == false`
//! sentinel).

use serde::de::{self, Deserialize, Deserializer};
use serde::{Serialize, Serializer};
use time::{Date as TimeDate, Duration, Month, OffsetDateTime};

/// A local calendar date. Ordering is chronological.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Date(TimeDate);

impl Date {
    /// Construct from year/month/day, returning `None` for any non-existent calendar date
    /// (bad month, bad day, Feb 29 on a non-leap year, …).
    pub fn from_ymd(year: i32, month: u8, day: u8) -> Option<Date> {
        let month = Month::try_from(month).ok()?;
        TimeDate::from_calendar_date(year, month, day)
            .ok()
            .map(Date)
    }

    /// Today's date in the local timezone (falls back to UTC if the local offset is
    /// indeterminate), matching the C++ `Date::today()`.
    pub fn today() -> Date {
        let now = OffsetDateTime::now_local().unwrap_or_else(|_| OffsetDateTime::now_utc());
        Date(now.date())
    }

    /// Parse a strict `"YYYY-MM-DD"` string. Returns `None` on any parse error or invalid
    /// calendar date. Mirrors the C++ parser: exactly 10 chars, ASCII digits, dashes at 4 and 7.
    pub fn from_iso(iso: &str) -> Option<Date> {
        let bytes = iso.as_bytes();
        if bytes.len() != 10 || bytes[4] != b'-' || bytes[7] != b'-' {
            return None;
        }
        let field = |slice: &str| -> Option<u32> {
            if slice.bytes().all(|c| c.is_ascii_digit()) {
                slice.parse::<u32>().ok()
            } else {
                None
            }
        };
        let year = field(&iso[0..4])?;
        let month = field(&iso[5..7])?;
        let day = field(&iso[8..10])?;
        Date::from_ymd(
            i32::try_from(year).ok()?,
            u8::try_from(month).ok()?,
            u8::try_from(day).ok()?,
        )
    }

    /// Format as `"YYYY-MM-DD"`, matching the C++ `toIso()` and the on-disk format.
    pub fn to_iso(self) -> String {
        format!(
            "{:04}-{:02}-{:02}",
            self.0.year(),
            u8::from(self.0.month()),
            self.0.day()
        )
    }

    /// This date shifted by `n` days (negative shifts backward). Saturates at the calendar
    /// bounds rather than panicking.
    pub fn add_days(self, n: i64) -> Date {
        Date(self.0.saturating_add(Duration::days(n)))
    }

    /// Whole days from `self` to `other` (`other - self`); negative when `other` precedes `self`.
    pub fn days_until(self, other: Date) -> i64 {
        (other.0 - self.0).whole_days()
    }

    pub fn year(self) -> i32 {
        self.0.year()
    }

    pub fn month(self) -> u8 {
        u8::from(self.0.month())
    }

    pub fn day(self) -> u8 {
        self.0.day()
    }
}

impl Serialize for Date {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_iso())
    }
}

impl<'de> Deserialize<'de> for Date {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Date, D::Error> {
        let s = String::deserialize(deserializer)?;
        Date::from_iso(&s).ok_or_else(|| de::Error::custom(format!("invalid ISO date: {s}")))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Shorthand for a known-valid date.
    fn d(year: i32, month: u8, day: u8) -> Date {
        Date::from_ymd(year, month, day).unwrap()
    }

    // Ported from tests/test_date.cpp: TEST_CASE("Date::isValid").
    // The C++ `isValid()` checks become `from_ymd(...).is_some()/is_none()`.
    #[test]
    fn from_ymd_validity() {
        assert!(Date::from_ymd(2026, 4, 29).is_some());
        assert!(Date::from_ymd(0, 0, 0).is_none()); // C++ Date{} (all zero) is invalid
        assert!(Date::from_ymd(2026, 0, 1).is_none());
        assert!(Date::from_ymd(2026, 13, 1).is_none());
        assert!(Date::from_ymd(2026, 1, 0).is_none());
        assert!(Date::from_ymd(2026, 1, 32).is_none());
        assert!(Date::from_ymd(2024, 2, 29).is_some()); // leap year
        assert!(Date::from_ymd(2023, 2, 29).is_none()); // not leap
    }

    // Ported: TEST_CASE("Date::fromIso / toIso roundtrip").
    #[test]
    fn from_iso_to_iso_roundtrip() {
        let parsed = Date::from_iso("2026-04-29").unwrap();
        assert_eq!(parsed.year(), 2026);
        assert_eq!(parsed.month(), 4);
        assert_eq!(parsed.day(), 29);
        assert_eq!(parsed.to_iso(), "2026-04-29");
    }

    // Ported: TEST_CASE("Date::fromIso rejects bad input"), plus extra invalid-ISO edges.
    #[test]
    fn from_iso_rejects_bad_input() {
        assert!(Date::from_iso("not-a-date").is_none());
        assert!(Date::from_iso("2026/04/29").is_none());
        assert!(Date::from_iso("2026-13-01").is_none());
        assert!(Date::from_iso("").is_none());
        // Additional edge cases beyond the C++ set:
        assert!(Date::from_iso("2026-02-29").is_none()); // Feb 29 on a non-leap year
        assert!(Date::from_iso("2026-00-10").is_none()); // month 00
        assert!(Date::from_iso("2026-4-09").is_none()); // wrong width / misplaced dash
        assert!(Date::from_iso("20260429").is_none()); // missing separators
        assert!(Date::from_iso("2026-04-2a").is_none()); // non-digit
    }

    // Ported: TEST_CASE("Date::addDays identity").
    #[test]
    fn add_days_identity() {
        let start = d(2026, 4, 29);
        assert_eq!(start.add_days(0), start);
    }

    // Ported: TEST_CASE("Date::addDays simple forward").
    #[test]
    fn add_days_simple_forward() {
        assert_eq!(d(2026, 4, 29).add_days(1), d(2026, 4, 30));
        assert_eq!(d(2026, 4, 29).add_days(2), d(2026, 5, 1));
    }

    // Ported: TEST_CASE("Date::addDays month boundary").
    #[test]
    fn add_days_month_boundary() {
        assert_eq!(d(2026, 1, 31).add_days(1), d(2026, 2, 1));
        assert_eq!(d(2026, 3, 31).add_days(1), d(2026, 4, 1));
        assert_eq!(d(2026, 12, 31).add_days(1), d(2027, 1, 1));
    }

    // Ported: TEST_CASE("Date::addDays leap year Feb").
    #[test]
    fn add_days_leap_year_feb() {
        assert_eq!(d(2024, 2, 28).add_days(1), d(2024, 2, 29));
        assert_eq!(d(2024, 2, 29).add_days(1), d(2024, 3, 1));
        assert_eq!(d(2023, 2, 28).add_days(1), d(2023, 3, 1)); // non-leap
    }

    // Ported: TEST_CASE("Date::addDays negative (backward)").
    #[test]
    fn add_days_negative_backward() {
        assert_eq!(d(2026, 5, 1).add_days(-1), d(2026, 4, 30));
        assert_eq!(d(2026, 3, 1).add_days(-1), d(2026, 2, 28));
        assert_eq!(d(2024, 3, 1).add_days(-1), d(2024, 2, 29)); // leap
    }

    // Ported: TEST_CASE("Date::addDays large offset (SRS ladder)").
    #[test]
    fn add_days_large_offset_srs_ladder() {
        let start = d(2026, 4, 29);
        assert_eq!(start.add_days(1), d(2026, 4, 30));
        assert_eq!(start.add_days(2), d(2026, 5, 1));
        assert_eq!(start.add_days(5), d(2026, 5, 4));
        assert_eq!(start.add_days(15), d(2026, 5, 14));
        assert_eq!(start.add_days(30), d(2026, 5, 29));
    }

    // Ported: TEST_CASE("Date::daysUntil").
    #[test]
    fn days_until() {
        let a = d(2026, 4, 29);
        let b = d(2026, 5, 4);
        assert_eq!(a.days_until(b), 5);
        assert_eq!(b.days_until(a), -5);
        assert_eq!(a.days_until(a), 0);
    }

    // Ported: TEST_CASE("Date comparison operators").
    #[test]
    fn comparison_operators() {
        let a = d(2026, 4, 29);
        let b = d(2026, 4, 30);
        let c = d(2026, 4, 29);
        assert!(a == c);
        assert!(a != b);
        assert!(a < b);
        assert!(b > a);
        assert!(a <= c);
        assert!(a <= b);
        assert!(b >= a);
        assert!(c >= a);
    }

    /// `today()` returns a real date that survives the ISO round-trip (exercises today/to_iso/from_iso).
    #[test]
    fn today_round_trips_through_iso() {
        let today = Date::today();
        assert_eq!(Date::from_iso(&today.to_iso()), Some(today));
    }

    /// Date serializes as an ISO string (DB/bridge compat) and deserializes back unchanged.
    #[test]
    fn serde_uses_iso_string() {
        let date = d(2026, 4, 29);
        let json = serde_json::to_string(&date).unwrap();
        assert_eq!(json, "\"2026-04-29\"");
        let back: Date = serde_json::from_str(&json).unwrap();
        assert_eq!(back, date);
    }
}
