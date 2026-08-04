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
  /** The 1-based focus block currently running (or the last one, once done). */
  cycle: number;
  /** Total focus blocks this session runs (from the card's rhythm). */
  readonly cycles: number;
  /** Configured phase lengths in seconds, from the card's rhythm. */
  readonly focusSecs: number;
  readonly breakSecs: number;
}

/** A fresh session at the start of its first focus block, not yet running, using the card's rhythm. */
export function createPomodoro(rhythm: PomodoroRhythm): PomodoroState {
  const focusSecs = rhythm.focus_min * 60;
  const breakSecs = rhythm.break_min * 60;
  return {
    phase: "focus",
    remaining: focusSecs,
    running: false,
    focusedSecs: 0,
    cycle: 1,
    cycles: Math.max(1, rhythm.cycles),
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
 * do not. The session runs N focus blocks separated by breaks with no break after the last:
 * focus(1)→break→focus(2)→…→focus(N)→done. When a focus block hits zero it becomes `done` if it was
 * the last cycle, otherwise a `break` begins automatically (TECH-02.3); when a break hits zero the
 * next focus block begins and `cycle` advances. A paused / finished timer does not advance (remaining
 * time is held, TECH-02.4). Any leftover time carries across a phase boundary so large deltas stay
 * consistent.
 */
export function tick(state: PomodoroState, deltaSecs: number = 1): PomodoroState {
  if (!state.running || state.phase === "done") return state;

  let phase: PomodoroPhase = state.phase;
  let remaining = state.remaining;
  let focusedSecs = state.focusedSecs;
  let cycle = state.cycle;
  let running: boolean = state.running;
  let left = Math.max(0, Math.floor(deltaSecs));

  while (left > 0 && running) {
    const step = Math.min(left, remaining);
    remaining -= step;
    if (phase === "focus") focusedSecs += step;
    left -= step;

    if (remaining === 0) {
      if (phase === "focus") {
        if (cycle >= state.cycles) {
          phase = "done";
          running = false;
        } else {
          phase = "break";
          remaining = state.breakSecs;
        }
      } else {
        phase = "focus";
        remaining = state.focusSecs;
        cycle += 1;
      }
    }
  }

  return { ...state, phase, remaining, focusedSecs, cycle, running };
}

/** Whether the focus block has ended (phase is break or done). */
export function focusDone(state: PomodoroState): boolean {
  return state.phase !== "focus";
}

/** Whether the whole session has finished (focus + break elapsed). */
export function isComplete(state: PomodoroState): boolean {
  return state.phase === "done";
}
