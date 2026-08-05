// Pure 5-minute review-timer state machine for the postpone modal (T28). When a *review* (a stage
// past the first, AD-003) is about to be postponed, the app offers a 5-minute focused countdown
// first; the user can pause and resume it (holding the exact remaining time), and when it expires
// the modal asks "Você revisou?" — Sim completes the review, Não postpones it. Kept pure and
// JSX-free so the countdown / pause / resume transitions are unit-tested directly (the modal drives
// it with a 1-second interval).

import type { Stage } from "../../lib/bindings";

/** The review challenge length in seconds (5 minutes). */
export const REVIEW_SECONDS = 300;

export type TimerPhase = "idle" | "running" | "paused" | "done";

export interface TimerState {
  /** Whole seconds left on the countdown. */
  remaining: number;
  phase: TimerPhase;
}

/** A fresh countdown at its full length, not yet started. */
export function createTimer(total: number = REVIEW_SECONDS): TimerState {
  return { remaining: total, phase: "idle" };
}

/** Begin (or restart from idle) the countdown. A finished timer is not restarted. */
export function startTimer(state: TimerState): TimerState {
  if (state.phase === "done") return state;
  return { ...state, phase: "running" };
}

/** Pause a running countdown, holding the remaining time exactly. No-op otherwise. */
export function pauseTimer(state: TimerState): TimerState {
  if (state.phase !== "running") return state;
  return { ...state, phase: "paused" };
}

/** Resume a paused countdown from the exact remaining time. No-op otherwise. */
export function resumeTimer(state: TimerState): TimerState {
  if (state.phase !== "paused") return state;
  return { ...state, phase: "running" };
}

/**
 * Advance a running countdown by `deltaSecs` seconds. A paused / idle / finished timer does not
 * advance (the remaining time is held). Reaching zero transitions to `done`.
 */
export function tick(state: TimerState, deltaSecs: number = 1): TimerState {
  if (state.phase !== "running") return state;
  const remaining = Math.max(0, state.remaining - deltaSecs);
  if (remaining === 0) return { remaining: 0, phase: "done" };
  return { ...state, remaining };
}

/** Whether the countdown has expired (drives the "Você revisou?" question). */
export function isDone(state: TimerState): boolean {
  return state.phase === "done";
}

/**
 * Whether a card at `stage` is a *review* (past the first session) — the case that gets the 5-minute
 * challenge before postponing. Day 0 is the first study and `Done` is off the ladder; neither is a
 * review.
 */
export function isReviewStage(stage: Stage): boolean {
  return stage !== "Day0" && stage !== "Done";
}
