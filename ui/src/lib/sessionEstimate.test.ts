// T31 — session-estimate model tests (TECH-09 / TECH-EST, AD-010): rhythm→estimate derivation,
// per-technique defaults, the 5–180 range enforcement, and the active-vs-completed duration switch.

import { describe, expect, it } from "vitest";
import type { PomodoroRhythm } from "./bindings";
import {
  clampEst,
  DEFAULT_RHYTHM,
  defaultEstForTechnique,
  EST_MAX,
  EST_MIN,
  estFromRhythm,
  isEstInRange,
  sessionDurationLabel,
} from "./sessionEstimate";

describe("estFromRhythm", () => {
  it("derives the estimate from the rhythm's focus block (50/10 → 50 min)", () => {
    const rhythm: PomodoroRhythm = { focus_min: 50, break_min: 10 };
    expect(estFromRhythm(rhythm)).toBe(50);
  });

  it("uses the focus minutes for the 90/20 rhythm (→ 90 min)", () => {
    expect(estFromRhythm({ focus_min: 90, break_min: 20 })).toBe(90);
  });

  it("the default rhythm 25/5 yields a 25-minute estimate", () => {
    expect(estFromRhythm(DEFAULT_RHYTHM)).toBe(25);
  });
});

describe("defaultEstForTechnique", () => {
  it("Pomodoro defaults to one focus block of the default rhythm (25 min)", () => {
    expect(defaultEstForTechnique("Pomodoro")).toBe(25);
  });

  it("Pomodoro follows a supplied rhythm (50/10 → 50 min)", () => {
    expect(defaultEstForTechnique("Pomodoro", { focus_min: 50, break_min: 10 })).toBe(50);
  });

  it("Active Recall defaults to 20 minutes", () => {
    expect(defaultEstForTechnique("ActiveRecall")).toBe(20);
  });

  it("Feynman defaults to 20 minutes", () => {
    expect(defaultEstForTechnique("Feynman")).toBe(20);
  });

  it("Leitner defaults to 15 minutes", () => {
    expect(defaultEstForTechnique("Leitner")).toBe(15);
  });

  it("no technique has no estimate", () => {
    expect(defaultEstForTechnique(null)).toBeNull();
  });
});

describe("isEstInRange (5–180 bounds, TECH-09.2)", () => {
  it("accepts the inclusive lower and upper bounds", () => {
    expect(isEstInRange(EST_MIN)).toBe(true); // 5
    expect(isEstInRange(EST_MAX)).toBe(true); // 180
    expect(isEstInRange(60)).toBe(true);
  });

  it("rejects values just below and above the range", () => {
    expect(isEstInRange(4)).toBe(false);
    expect(isEstInRange(181)).toBe(false);
  });

  it("rejects non-finite values", () => {
    expect(isEstInRange(Number.NaN)).toBe(false);
  });
});

describe("clampEst", () => {
  it("clamps below the minimum up to 5 and above the maximum down to 180", () => {
    expect(clampEst(1)).toBe(EST_MIN);
    expect(clampEst(500)).toBe(EST_MAX);
    expect(clampEst(45)).toBe(45);
  });
});

describe("sessionDurationLabel (active vs completed switch, AD-010)", () => {
  it("an active card shows its estimate (~N min)", () => {
    expect(sessionDurationLabel(50, null)).toBe("~50 min");
    expect(sessionDurationLabel(50, undefined)).toBe("~50 min");
  });

  it("a completed card shows the actual focused time, overriding the estimate", () => {
    // 1500s = 25 min studied — actual wins over any estimate.
    expect(sessionDurationLabel(50, 1500)).toBe("25 min estudados");
  });

  it("shows nothing when neither an estimate nor focused time is known", () => {
    expect(sessionDurationLabel(null, null)).toBeNull();
    expect(sessionDurationLabel(undefined, undefined)).toBeNull();
  });
});
