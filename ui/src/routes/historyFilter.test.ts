// T34 — history filter/count tests (HIST-01/02/03/05): per-axis filtering, the ANDed method+technique
// narrowing, the unified (null) view, the result count, and which rows can be revived.

import { describe, expect, it } from "vitest";
import type { HistoryEvent, Method, Technique } from "../lib/bindings";
import { filterHistory, historyCount, isRevivable } from "./historyFilter";

let nextId = 1;
function ev(
  method: Method,
  technique: Technique | null,
  overrides: Partial<HistoryEvent> = {},
): HistoryEvent {
  return {
    id: nextId++,
    card_id: nextId,
    kind: "completed",
    from_stage: "Day0",
    to_stage: "Day1",
    method,
    technique,
    focused_secs: null,
    self_rating: null,
    when: "2026-07-01",
    ...overrides,
  };
}

const EVENTS: HistoryEvent[] = [
  ev("SpacedRepetition", "Pomodoro"),
  ev("SpacedRepetition", null),
  ev("ExamPrep", "ActiveRecall"),
  ev("ExamPrep", "Pomodoro"),
];

describe("filterHistory (HIST-03)", () => {
  it("null/null returns every event (unified view, HIST-02)", () => {
    expect(filterHistory(EVENTS, { method: null, technique: null })).toHaveLength(4);
  });

  it("filters by method only (HIST-01)", () => {
    const spaced = filterHistory(EVENTS, { method: "SpacedRepetition", technique: null });
    expect(spaced).toHaveLength(2);
    expect(spaced.every((e) => e.method === "SpacedRepetition")).toBe(true);
  });

  it("filters by technique only", () => {
    const pomodoro = filterHistory(EVENTS, { method: null, technique: "Pomodoro" });
    expect(pomodoro).toHaveLength(2);
    expect(pomodoro.every((e) => e.technique === "Pomodoro")).toBe(true);
  });

  it("ANDs method and technique together", () => {
    const examPomodoro = filterHistory(EVENTS, {
      method: "ExamPrep",
      technique: "Pomodoro",
    });
    expect(examPomodoro).toHaveLength(1);
    expect(examPomodoro[0].method).toBe("ExamPrep");
    expect(examPomodoro[0].technique).toBe("Pomodoro");
  });

  it("returns an empty list when nothing matches", () => {
    expect(
      filterHistory(EVENTS, { method: "SpacedRepetition", technique: "ActiveRecall" }),
    ).toHaveLength(0);
  });
});

describe("historyCount (HIST-03 result count)", () => {
  it("counts the matching events", () => {
    expect(historyCount(EVENTS, { method: null, technique: null })).toBe(4);
    expect(historyCount(EVENTS, { method: "ExamPrep", technique: null })).toBe(2);
    expect(historyCount(EVENTS, { method: "SpacedRepetition", technique: "ActiveRecall" })).toBe(0);
  });
});

describe("isRevivable (HIST-05)", () => {
  it("a study completed to Done is revivable", () => {
    expect(isRevivable(ev("SpacedRepetition", null, { to_stage: "Done" }))).toBe(true);
  });

  it("an explicit archived event is revivable", () => {
    expect(isRevivable(ev("ExamPrep", null, { kind: "archived", to_stage: "Day5" }))).toBe(true);
  });

  it("an in-progress completion (advancing to Day 1) is not revivable", () => {
    expect(isRevivable(ev("SpacedRepetition", null, { to_stage: "Day1" }))).toBe(false);
  });
});
