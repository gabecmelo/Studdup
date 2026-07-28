// Type bindings for the Rust <-> TS bridge.
//
// Hand-kept and reviewed 1:1 against `studdup-core` (domain + `api`) and `studdup/src/commands.rs`,
// mirroring the exact serde wire formats:
//   - field-less enums serialize as their PascalCase variant name (verified against serde output);
//   - `Option<T>` becomes `T | null`;
//   - `Date` uses the custom ISO `YYYY-MM-DD` string serializer;
//   - `ApiError` is adjacently tagged as `{ kind, detail? }` (`#[serde(tag = "kind", content = "detail")]`).
//
// The typed `invoke` client that consumes these lives in `commands.ts` (T21). Keep this file in
// sync whenever a `core::api` signature or a domain struct changes.

/** ISO calendar date, `"YYYY-MM-DD"` (custom serde string surface, DB-compatible). */
export type ISODate = string;

/** Study method — the *when* axis (AD-001). */
export type Method = "SpacedRepetition" | "ExamPrep";

/** Spaced-repetition stage; the value is the day offset from `start_date` (AD-003). */
export type Stage = "Day0" | "Day1" | "Day2" | "Day5" | "Day15" | "Day30" | "Done";

/** Study technique — the *how* axis. Absent (`null`) means no technique. */
export type Technique = "Pomodoro" | "ActiveRecall" | "Feynman" | "Leitner";

/** A Pomodoro focus/break cadence, in minutes. */
export interface PomodoroRhythm {
  focus_min: number;
  break_min: number;
}

/** A study card. */
export interface Card {
  id: number;
  title: string;
  content_link: string;
  review_link: string;
  method: Method;
  technique: Technique | null;
  est_minutes: number | null;
  pomodoro: PomodoroRhythm | null;
  start_date: ISODate;
  current_stage: Stage;
  exam_id: number | null;
  created_at: ISODate;
  last_completed_at: ISODate | null;
  archived: boolean;
}

/** A first-class exam grouping its cards (AD-005). */
export interface Exam {
  id: number;
  name: string;
  exam_date: ISODate;
  created_at: ISODate;
  concluded: boolean;
}

/** A materialized study session for an exam card — frozen at card creation. */
export interface ExamSession {
  id: number;
  card_id: number;
  seq: number;
  due_date: ISODate;
  completed_at: ISODate | null;
}

/** A recorded card event; `kind` is one of created|completed|postponed|restart|erase|revived. */
export interface HistoryEvent {
  id: number;
  card_id: number;
  kind: string;
  from_stage: Stage;
  to_stage: Stage;
  method: Method;
  technique: Technique | null;
  focused_secs: number | null;
  self_rating: number | null;
  when: ISODate;
}

/** A Leitner box item (front/back), scoped to a Leitner-technique card (TECH-08). */
export interface LeitnerItem {
  id: number;
  card_id: number;
  front: string;
  back: string;
  box_no: number;
  due_date: ISODate;
}

/** History query filter — `method: null` is the unified view; `technique` narrows it (HIST-02/03). */
export interface HistoryFilter {
  method: Method | null;
  technique: Technique | null;
}

/** Typed failure from any command (`#[serde(tag = "kind", content = "detail")]`). */
export type ApiError =
  | { kind: "EmptyTitle" }
  | { kind: "TitleTooLong"; detail: { max: number; actual: number } }
  | { kind: "EstOutOfRange"; detail: { min: number; max: number; actual: number } }
  | { kind: "EmptyExamName" }
  | { kind: "ExamDateInPast" }
  | { kind: "ExamDateTooFar"; detail: { max: string } }
  | { kind: "ExamNotFound"; detail: number }
  | { kind: "CardNotFound"; detail: number }
  | { kind: "Database"; detail: string };

/**
 * Command argument shapes, keyed by command name — the 1:1 surface of `studdup/src/commands.rs`.
 * Tauri camelCases nothing here since every field is already snake_case or a bare scalar.
 */
export interface Commands {
  create_card: { args: { card: Card }; returns: Card };
  edit_card: { args: { card: Card }; returns: Card };
  complete_card: { args: { id: number }; returns: Card };
  record_session: {
    args: { id: number; focusedSecs: number; selfRating: number | null };
    returns: Card;
  };
  postpone_card: { args: { id: number; days: number }; returns: Card };
  restart_card: { args: { id: number }; returns: Card };
  erase_card: { args: { id: number }; returns: Card };
  revive_card: { args: { id: number }; returns: Card };
  delete_card: { args: { id: number }; returns: null };
  create_exam: { args: { name: string; examDate: ISODate }; returns: Exam };
  delete_exam: { args: { examId: number }; returns: null };
  list_board: { args: { method: Method }; returns: Card[] };
  list_history: {
    args: { method: Method | null; technique: Technique | null };
    returns: HistoryEvent[];
  };
}
