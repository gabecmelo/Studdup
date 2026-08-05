// Pure exam target-date validation for the Nova Prova modal (T30). Mirrors the core
// `api::create_exam` bounds (studdup-core/src/api.rs): the date must be today or later, and no more
// than 5 calendar years out (EXAM-01 + the spec's "more than 5 years → reject" edge case). Kept
// JSX-free so the past / too-far branches are unit-tested directly and the modal disables "Criar
// prova" before a command is issued.
//
// ISO `YYYY-MM-DD` strings compare lexicographically the same as chronologically, so the bounds are
// plain string comparisons.

import type { ISODate } from "../../lib/bindings";

/** How many calendar years ahead an exam date may be (matches core `EXAM_MAX_YEARS`). */
export const EXAM_MAX_YEARS = 5;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * The latest acceptable exam date: `EXAM_MAX_YEARS` calendar years after `today`, clamping a
 * Feb-29 anchor to Feb-28 when the target year is not a leap year (mirrors core `max_exam_date`).
 */
export function maxExamDate(today: ISODate): ISODate {
  const [y, m, d] = today.split("-").map(Number);
  const year = y + EXAM_MAX_YEARS;
  let day = d;
  if (m === 2 && d === 29 && !isLeapYear(year)) day = 28;
  const mm = String(m).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export type ExamDateValidation =
  | { valid: true }
  | { valid: false; code: "empty" | "past" | "too-far"; message: string };

/**
 * Validate an exam target date against the core's bounds relative to `today`:
 *   - empty → rejected (`empty`);
 *   - earlier than today → rejected (`past`);
 *   - more than 5 calendar years out → rejected (`too-far`);
 *   - today .. today+5y inclusive → valid.
 */
export function validateExamDate(date: string, today: ISODate): ExamDateValidation {
  if (date.trim().length === 0) {
    return { valid: false, code: "empty", message: "Escolha a data da prova." };
  }
  if (date < today) {
    return {
      valid: false,
      code: "past",
      message: "A data deve ser hoje ou posterior.",
    };
  }
  const max = maxExamDate(today);
  if (date > max) {
    return {
      valid: false,
      code: "too-far",
      message: `A data está muito distante — escolha uma data até ${max}.`,
    };
  }
  return { valid: true };
}
