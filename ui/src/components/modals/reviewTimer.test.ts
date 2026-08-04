import { describe, expect, it } from "vitest";
import {
  REVIEW_SECONDS,
  createTimer,
  isDone,
  isReviewStage,
  pauseTimer,
  resumeTimer,
  startTimer,
  tick,
} from "./reviewTimer";

describe("createTimer / startTimer", () => {
  it("starts at the full 5-minute length, idle until started", () => {
    const t = createTimer();
    expect(t.remaining).toBe(REVIEW_SECONDS);
    expect(t.phase).toBe("idle");
    expect(startTimer(t).phase).toBe("running");
  });
});

describe("tick (countdown)", () => {
  it("decrements the remaining time only while running", () => {
    const running = startTimer(createTimer(10));
    const after = tick(running, 1);
    expect(after.remaining).toBe(9);
    expect(after.phase).toBe("running");
  });

  it("does not advance while idle or paused (remaining is held)", () => {
    const idle = createTimer(10);
    expect(tick(idle, 1)).toEqual(idle);
    const paused = pauseTimer(startTimer(createTimer(10)));
    expect(tick(paused, 5).remaining).toBe(10);
  });

  it("transitions to done and stops at zero", () => {
    const near = { remaining: 2, phase: "running" as const };
    const done = tick(near, 2);
    expect(done.remaining).toBe(0);
    expect(done.phase).toBe("done");
    expect(isDone(done)).toBe(true);
    // A finished timer does not go negative or resume ticking.
    expect(tick(done, 1)).toEqual(done);
  });
});

describe("pause / resume", () => {
  it("holds the exact remaining time across pause then resumes from it", () => {
    let t = startTimer(createTimer(REVIEW_SECONDS));
    t = tick(t, 108); // 300 - 108 = 192 remaining (03:12)
    expect(t.remaining).toBe(192);
    const paused = pauseTimer(t);
    expect(paused.phase).toBe("paused");
    expect(paused.remaining).toBe(192);
    const resumed = resumeTimer(paused);
    expect(resumed.phase).toBe("running");
    expect(resumed.remaining).toBe(192); // resumes from the exact held time
    expect(tick(resumed, 1).remaining).toBe(191);
  });

  it("pause is a no-op unless running; resume is a no-op unless paused", () => {
    const idle = createTimer(10);
    expect(pauseTimer(idle)).toEqual(idle);
    expect(resumeTimer(idle)).toEqual(idle);
    const running = startTimer(idle);
    expect(resumeTimer(running)).toEqual(running);
  });
});

describe("isReviewStage (reviews get the 5-min challenge)", () => {
  it("treats stages past the first as reviews, and Day 0 / Done as not", () => {
    expect(isReviewStage("Day0")).toBe(false);
    expect(isReviewStage("Done")).toBe(false);
    expect(isReviewStage("Day1")).toBe(true);
    expect(isReviewStage("Day5")).toBe(true);
    expect(isReviewStage("Day30")).toBe(true);
  });
});
