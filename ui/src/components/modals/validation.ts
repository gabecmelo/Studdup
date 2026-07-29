// Pure card-title validation for the new/edit card modals (T25). Mirrors the core `api::validate_title`
// bound (studdup-core/src/api.rs: title 1–200 characters, counting Unicode code points; empty or
// whitespace-only is rejected) so the UI disables "Criar"/"Salvar" and shows an inline error before a
// command is ever issued (spec edge cases: empty/whitespace title, title > 200 chars). Kept JSX-free so
// the board's helper-test pattern (columns.ts/links.ts) applies and it can be unit-tested directly.

import type { Technique } from "../../lib/bindings";

/** Inclusive maximum title length in characters (matches core `TITLE_MAX`). */
export const TITLE_MAX = 200;

/** Count a title's length in Unicode code points (matches Rust `str::chars().count()`). */
export function titleCharCount(title: string): number {
  return Array.from(title).length;
}

/** Result of validating a card title: either valid, or invalid with a reason code + inline message. */
export type TitleValidation =
  | { valid: true }
  | { valid: false; code: "empty" | "too-long"; message: string };

/**
 * Validate a card title against the same rule the core enforces:
 *   - empty or whitespace-only → rejected (`empty`);
 *   - more than TITLE_MAX code points → rejected (`too-long`);
 *   - otherwise valid.
 * The message is the inline field error shown in the modal.
 */
export function validateTitle(title: string): TitleValidation {
  if (title.trim().length === 0) {
    return {
      valid: false,
      code: "empty",
      message: "Dê um título ao card pra achar ele depois.",
    };
  }
  if (titleCharCount(title) > TITLE_MAX) {
    return {
      valid: false,
      code: "too-long",
      message: `Máximo de ${TITLE_MAX} caracteres — encurte o título.`,
    };
  }
  return { valid: true };
}

/** Technique picker options (the four techniques plus the explicit "no technique" choice, TECH-01). */
export type TechniqueChoice = Technique | "none";

export const TECHNIQUE_CHOICES: readonly TechniqueChoice[] = [
  "none",
  "Pomodoro",
  "ActiveRecall",
  "Feynman",
  "Leitner",
] as const;
