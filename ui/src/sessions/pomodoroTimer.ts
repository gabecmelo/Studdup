// Pure Pomodoro timer state machine (TECH-02, AD-010). Drives the focus→break session from a card's
// configured rhythm: a focus countdown, then — automatically at zero — a break countdown, then done.
// The user can pause and resume (holding the exact remaining time), and the machine accumulates the
// elapsed *focused* seconds so completion can record them on the history event (TECH-03). Kept pure
// and JSX-free so every transition is unit-tested directly; the session screen ticks it at 1 Hz.

import type { PomodoroRhythm } from "../lib/bindings";

export type PomodoroPhase = "focus" | "break" | "done";

export interface PomodoroState {
  phase: PomodoroPhase;
  /** Whole seconds left in the current phase. */
  remaining: number;
  running: boolean;
  /** Seconds actually spent in FOCUS phases so far (excludes break + paused time) — TECH-03. */
  focusedSecs: number;
  /** Configured phase lengths in seconds, from the card's rhythm. */
  readonly focusSecs: number;
  readonly breakSecs: number;
}

/** A fresh session at the start of its focus block, not yet running, using the card's rhythm. */
export function createPomodoro(rhythm: PomodoroRhythm): PomodoroState {
  const focusSecs = rhythm.focus_min * 60;
  const breakSecs = rhythm.break_min * 60;
  return {
    phase: "focus",
    remaining: focusSecs,
    running: false,
    focusedSecs: 0,
    focusSecs,
    breakSecs,
  };
}

/** Begin (or resume) the countdown. A finished session is not restarted. */
export function start(state: PomodoroState): PomodoroState {
  if (state.phase === "done") return state;
  return { ...state, running: true };
}

/** Pause a running countdown, holding the remaining time exactly. No-op otherwise. */
export function pause(state: PomodoroState): PomodoroState {
  if (!state.running) return state;
  return { ...state, running: false };
}

/** Resume a paused countdown from the exact remaining time. No-op otherwise. */
export function resume(state: PomodoroState): PomodoroState {
  if (state.running || state.phase === "done") return state;
  return { ...state, running: true };
}

/**
 * Advance a running countdown by `deltaSecs`. Focus seconds accrue into `focusedSecs`; break seconds
 * do not. When the focus countdown reaches zero the phase transitions to `break` and the break
 * countdown begins automatically (TECH-02.3); when the break reaches zero the phase becomes `done`
 * and the timer stops. A paused / finished timer does not advance (remaining time is held, TECH-02.4).
 * Any leftover time carries across a phase boundary so large deltas stay consistent.
 */
export function tick(state: PomodoroState, deltaSecs: number = 1): PomodoroState {
  if (!state.running || state.phase === "done") return state;

  let phase: PomodoroPhase = state.phase;
  let remaining = state.remaining;
  let focusedSecs = state.focusedSecs;
  let running: boolean = state.running;
  let left = Math.max(0, Math.floor(deltaSecs));

  while (left > 0 && running) {
    const step = Math.min(left, remaining);
    remaining -= step;
    if (phase === "focus") focusedSecs += step;
    left -= step;

    if (remaining === 0) {
      if (phase === "focus") {
        phase = "break";
        remaining = state.breakSecs;
      } else {
        phase = "done";
        running = false;
      }
    }
  }

  return { ...state, phase, remaining, focusedSecs, running };
}

/** Whether the focus block has ended (phase is break or done). */
export function focusDone(state: PomodoroState): boolean {
  return state.phase !== "focus";
}

/** Whether the whole session has finished (focus + break elapsed). */
export function isComplete(state: PomodoroState): boolean {
  return state.phase === "done";
}
