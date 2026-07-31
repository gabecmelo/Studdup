// TECH-04.1 as a value-precise test: the source material stays hidden while the user writes from
// memory and is revealed only after they submit (reach compare/rate). This is the Active Recall
// story's own independent test, extracted from JSX into the pure `isSourceRevealed` predicate the
// session routes its link rendering through.

import { describe, expect, it } from "vitest";
import { type ActiveRecallPhase, isSourceRevealed } from "./recallPhase";

describe("isSourceRevealed (TECH-04.1)", () => {
  it("hides the source while the user is still writing from memory", () => {
    expect(isSourceRevealed("write")).toBe(false);
  });

  it("reveals the source once the recall is submitted (compare/rate)", () => {
    expect(isSourceRevealed("compare")).toBe(true);
    expect(isSourceRevealed("rate")).toBe(true);
  });

  it("reveals in exactly the non-write phases and no others", () => {
    const phases: ActiveRecallPhase[] = ["write", "compare", "rate"];
    expect(phases.filter(isSourceRevealed)).toEqual(["compare", "rate"]);
  });
});
