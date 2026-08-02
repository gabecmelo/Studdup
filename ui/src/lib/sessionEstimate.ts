// Pure session-estimate model (TECH-09 / TECH-EST, AD-010). Owns three things the card modals and
// the board need, kept JSX-free so each rule is unit-tested directly:
//   1. per-technique default estimated session length (Pomodoro = one focus block; Active Recall &
//      Feynman = 20 min; Leitner = 15 min; no technique = no estimate);
//   2. the Pomodoro rhythm presets + custom, and the est derived from a rhythm (its focus block);
//   3. the board's active-vs-completed duration label (estimate while active, actual focused time
//      once completed — same slot, two meanings by card state).

import type { PomodoroRhythm, Technique } from "./bindings";

/** Inclusive estimated-session-length bounds in minutes (mirrors core `EST_MIN`/`EST_MAX`). */
export const EST_MIN = 5;
export const EST_MAX = 180;

/** The Pomodoro rhythm presets (AD-010). `custom` is entered by the user. */
export const RHYTHM_PRESETS: readonly PomodoroRhythm[] = [
  { focus_min: 25, break_min: 5, cycles: 4 },
  { focus_min: 50, break_min: 10, cycles: 4 },
  { focus_min: 90, break_min: 20, cycles: 4 },
] as const;

/** The default Pomodoro rhythm — 25/5, 4 cycles (AD-010). */
export const DEFAULT_RHYTHM: PomodoroRhythm = { focus_min: 25, break_min: 5, cycles: 4 };

/**
 * The estimated session length a Pomodoro rhythm implies: its focus blocks across every cycle
 * (`cycles × focus_min`), clamped into the accepted 5–180 range. 25/5×4 → 100; 50/10×4 → 200→180.
 */
export function estFromRhythm(rhythm: PomodoroRhythm): number {
  return clampEst(rhythm.cycles * rhythm.focus_min);
}

/** Per-technique default estimate in minutes, excluding Pomodoro (which derives from its rhythm). */
const FIXED_DEFAULT_EST: Record<Exclude<Technique, "Pomodoro">, number> = {
  ActiveRecall: 20,
  Feynman: 20,
  Leitner: 15,
};

/**
 * The default estimated length for a technique (TECH-09.1). Pomodoro derives from its rhythm (its
 * focus block, defaulting to the 25/5 rhythm); the others use their fixed defaults. `null` technique
 * has no estimate.
 */
export function defaultEstForTechnique(
  technique: Technique | null,
  rhythm: PomodoroRhythm = DEFAULT_RHYTHM,
): number | null {
  if (technique === null) return null;
  if (technique === "Pomodoro") return estFromRhythm(rhythm);
  return FIXED_DEFAULT_EST[technique];
}

/** Whether an estimate is within the accepted 5–180 minute range (TECH-09.2). */
export function isEstInRange(minutes: number): boolean {
  return Number.isFinite(minutes) && minutes >= EST_MIN && minutes <= EST_MAX;
}

/** Clamp an estimate into the accepted range (used when applying a rhythm-derived value). */
export function clampEst(minutes: number): number {
  return Math.min(EST_MAX, Math.max(EST_MIN, Math.round(minutes)));
}

/** The settings-table key holding the global default estimate for a technique (TECH-09.5). */
export function defaultEstSettingKey(technique: Technique): string {
  return `default_est.${technique}`;
}

/**
 * The duration label shown beside a card's technique (TECH-EST / AD-010): a *completed* card shows
 * the actual focused time recorded on its session; an *active* card shows its estimate. `focusedSecs`
 * present ⇒ completed (actual wins); otherwise the estimate; `null` when neither is known.
 */
export function sessionDurationLabel(
  estMinutes: number | null | undefined,
  focusedSecs: number | null | undefined,
): string | null {
  if (focusedSecs != null) {
    return `${Math.round(focusedSecs / 60)} min estudados`;
  }
  if (estMinutes != null) {
    return `~${estMinutes} min`;
  }
  return null;
}
