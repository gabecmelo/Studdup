//! Study vocabularies: method, stage (stage-as-offset), technique and Pomodoro rhythm.

use serde::{Deserialize, Serialize};

/// Study method — the *when* axis. Mutually exclusive per card, fixed at creation (AD-001).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Method {
    SpacedRepetition,
    ExamPrep,
}

/// Spaced-repetition stage. The enum value **is** the day offset from `start_date` (AD-003),
/// so `due_date == start_date + stage`. `Done = -1` is the sentinel off the ladder.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(i16)]
pub enum Stage {
    Day0 = 0,
    Day1 = 1,
    Day2 = 2,
    Day5 = 5,
    Day15 = 15,
    Day30 = 30,
    Done = -1,
}

impl Stage {
    /// The day offset this stage represents (AD-003). `Done` yields `-1`.
    pub fn offset(self) -> i16 {
        self as i16
    }
}

/// The next stage on the fixed ladder 0 → 1 → 2 → 5 → 15 → 30 → Done.
/// `Day30` advances to `Done`; `Done` is terminal. Port of C++ `nextStage`.
pub fn next_stage(s: Stage) -> Stage {
    match s {
        Stage::Day0 => Stage::Day1,
        Stage::Day1 => Stage::Day2,
        Stage::Day2 => Stage::Day5,
        Stage::Day5 => Stage::Day15,
        Stage::Day15 => Stage::Day30,
        Stage::Day30 => Stage::Done,
        Stage::Done => Stage::Done,
    }
}

/// Human label for a stage. Port of C++ `stageLabel`.
pub fn stage_label(s: Stage) -> &'static str {
    match s {
        Stage::Day0 => "Day 0",
        Stage::Day1 => "Day 1",
        Stage::Day2 => "Day 2",
        Stage::Day5 => "Day 5",
        Stage::Day15 => "Day 15",
        Stage::Day30 => "Day 30",
        Stage::Done => "Done",
    }
}

/// Study technique — the *how* axis. Optional per card (`Option<Technique>` = none).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Technique {
    Pomodoro,
    ActiveRecall,
    Feynman,
    Leitner,
}

/// A Pomodoro focus/break cadence, in minutes.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct PomodoroRhythm {
    pub focus_min: u16,
    pub break_min: u16,
}

impl PomodoroRhythm {
    /// Preset 25/5 — the default rhythm (AD-010).
    pub const CLASSIC: PomodoroRhythm = PomodoroRhythm {
        focus_min: 25,
        break_min: 5,
    };
    /// Preset 50/10.
    pub const LONG: PomodoroRhythm = PomodoroRhythm {
        focus_min: 50,
        break_min: 10,
    };
    /// Preset 90/20.
    pub const DEEP: PomodoroRhythm = PomodoroRhythm {
        focus_min: 90,
        break_min: 20,
    };
}

impl Default for PomodoroRhythm {
    fn default() -> Self {
        PomodoroRhythm::CLASSIC
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The full ladder, one hop at a time, including Day30 → Done and Done → Done.
    #[test]
    fn next_stage_walks_the_full_ladder() {
        assert_eq!(next_stage(Stage::Day0), Stage::Day1);
        assert_eq!(next_stage(Stage::Day1), Stage::Day2);
        assert_eq!(next_stage(Stage::Day2), Stage::Day5);
        assert_eq!(next_stage(Stage::Day5), Stage::Day15);
        assert_eq!(next_stage(Stage::Day15), Stage::Day30);
        assert_eq!(next_stage(Stage::Day30), Stage::Done);
        assert_eq!(next_stage(Stage::Done), Stage::Done);
    }

    /// AD-003: each stage's numeric value is exactly its day offset from `start_date`.
    #[test]
    fn stage_offset_equals_day_value() {
        assert_eq!(Stage::Day0.offset(), 0);
        assert_eq!(Stage::Day1.offset(), 1);
        assert_eq!(Stage::Day2.offset(), 2);
        assert_eq!(Stage::Day5.offset(), 5);
        assert_eq!(Stage::Day15.offset(), 15);
        assert_eq!(Stage::Day30.offset(), 30);
        assert_eq!(Stage::Done.offset(), -1);
    }

    #[test]
    fn stage_labels_match_cpp() {
        assert_eq!(stage_label(Stage::Day0), "Day 0");
        assert_eq!(stage_label(Stage::Day30), "Day 30");
        assert_eq!(stage_label(Stage::Done), "Done");
    }

    #[test]
    fn pomodoro_presets_and_default() {
        assert_eq!(
            PomodoroRhythm::CLASSIC,
            PomodoroRhythm {
                focus_min: 25,
                break_min: 5
            }
        );
        assert_eq!(
            PomodoroRhythm::LONG,
            PomodoroRhythm {
                focus_min: 50,
                break_min: 10
            }
        );
        assert_eq!(
            PomodoroRhythm::DEEP,
            PomodoroRhythm {
                focus_min: 90,
                break_min: 20
            }
        );
        assert_eq!(PomodoroRhythm::default(), PomodoroRhythm::CLASSIC);
    }
}
