// T32 — Pomodoro timer state-machine tests (TECH-02/03): rhythm-configured phase lengths, the
// focus→break auto-transition at zero, elapsed-focused-seconds accounting, pause/resume holding the
// remaining time, and break→done completion.

import { describe, expect, it } from "vitest";
import type { PomodoroRhythm } from "../lib/bindings";
import {
  createPomodoro,
  focusDone,
  isComplete,
  pause,
  resume,
  start,
  tick,
} from "./pomodoroTimer";

const CLASSIC: PomodoroRhythm = { focus_min: 25, break_min: 5 };
const LONG: PomodoroRhythm = { focus_min: 50, break_min: 10 };

/** Tick a running timer `n` whole seconds, one second at a time (as the screen's 1 Hz interval). */
function run(state: ReturnType<typeof createPomodoro>, n: number) {
  let s = state;
  for (let i = 0; i < n; i++) s = tick(s, 1);
  return s;
}

describe("createPomodoro (uses the configured rhythm)", () => {
  it("starts in the focus phase with focus-length seconds, not running", () => {
    const s = createPomodoro(CLASSIC);
    expect(s.phase).toBe("focus");
    expect(s.remaining).toBe(25 * 60);
    expect(s.running).toBe(false);
    expect(s.focusedSecs).toBe(0);
  });

  it("takes phase lengths from a different rhythm (50/10 → 3000s focus, 600s break)", () => {
    const s = createPomodoro(LONG);
    expect(s.focusSecs).toBe(3000);
    expect(s.breakSecs).toBe(600);
  });
});

describe("focus countdown + elapsed-seconds accounting (TECH-03)", () => {
  it("a running focus tick decrements remaining and accrues one focused second", () => {
    const s = tick(start(createPomodoro(CLASSIC)), 1);
    expect(s.remaining).toBe(25 * 60 - 1);
    expect(s.focusedSecs).toBe(1);
  });

  it("accumulates exactly the focused seconds elapsed", () => {
    const s = run(start(createPomodoro(CLASSIC)), 90);
    expect(s.focusedSecs).toBe(90);
    expect(s.remaining).toBe(25 * 60 - 90);
    expect(s.phase).toBe("focus");
  });
});

describe("focus→break auto-transition (TECH-02.3)", () => {
  it("reaching zero focus switches to the break phase and auto-starts it", () => {
    // 50-min focus so the run is exact; drain the full focus block.
    const s = run(start(createPomodoro(LONG)), 3000);
    expect(s.phase).toBe("break");
    expect(s.remaining).toBe(600); // break countdown begins at its full length
    expect(s.running).toBe(true); // the break countdown auto-starts (no user action)
    expect(focusDone(s)).toBe(true);
  });

  it("break seconds do NOT add to focused seconds (only focus time counts)", () => {
    let s = run(start(createPomodoro(LONG)), 3000); // end of focus → break begins
    expect(s.focusedSecs).toBe(3000);
    s = run(s, 30); // 30s into the break
    expect(s.focusedSecs).toBe(3000); // break time is not focused time
    expect(s.remaining).toBe(570);
  });
});

describe("break→done completion", () => {
  it("draining the break finishes the session and stops the timer", () => {
    let s = run(start(createPomodoro(LONG)), 3000 + 600);
    expect(s.phase).toBe("done");
    expect(s.running).toBe(false);
    expect(isComplete(s)).toBe(true);
    expect(s.focusedSecs).toBe(3000); // focused total is the full focus block
  });
});

describe("pause / resume hold the remaining time (TECH-02.4)", () => {
  it("a paused timer does not advance and accrues no focused seconds", () => {
    const running = run(start(createPomodoro(CLASSIC)), 120); // 2 min into focus
    const paused = pause(running);
    const still = tick(paused, 5);
    expect(still.remaining).toBe(running.remaining); // remaining held while paused
    expect(still.focusedSecs).toBe(120); // no focused seconds accrue while paused
  });

  it("resuming continues from the exact remaining time", () => {
    const running = run(start(createPomodoro(CLASSIC)), 120);
    const resumed = resume(pause(running));
    const after = tick(resumed, 1);
    expect(resumed.running).toBe(true);
    expect(after.remaining).toBe(running.remaining - 1);
    expect(after.focusedSecs).toBe(121);
  });
});
