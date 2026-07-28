//! Minimal `Date` placeholder for the domain structs.
//!
//! T6 replaces this internals with a `time`-crate-backed implementation, preserving this
//! public surface (`from_ymd`, accessors, ISO round-trip). Kept intentionally small here so
//! the domain structs compile before the full port lands.

use serde::{Deserialize, Serialize};

/// A local calendar date.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct Date {
    year: i32,
    month: u8,
    day: u8,
}

impl Date {
    /// Construct from year/month/day, rejecting obviously out-of-range values.
    /// (Full calendar validation — e.g. Feb 29 on non-leap years — arrives in T6.)
    pub fn from_ymd(year: i32, month: u8, day: u8) -> Option<Date> {
        if (1..=12).contains(&month) && (1..=31).contains(&day) {
            Some(Date { year, month, day })
        } else {
            None
        }
    }

    pub fn year(self) -> i32 {
        self.year
    }

    pub fn month(self) -> u8 {
        self.month
    }

    pub fn day(self) -> u8 {
        self.day
    }
}
