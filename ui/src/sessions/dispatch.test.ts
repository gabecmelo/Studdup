// T52/T57 — session dispatch (TECH-04/05/08): each technique maps to its guided session screen; only a
// card with no technique falls back to the plain "none" session.

import { describe, expect, it } from "vitest";
import { sessionKind } from "./dispatch";

describe("sessionKind", () => {
  it("maps Pomodoro to the pomodoro screen", () => {
    expect(sessionKind("Pomodoro")).toBe("pomodoro");
  });

  it("maps Active Recall to the activeRecall screen", () => {
    expect(sessionKind("ActiveRecall")).toBe("activeRecall");
  });

  it("maps Feynman to the feynman screen", () => {
    expect(sessionKind("Feynman")).toBe("feynman");
  });

  it("maps Leitner to the leitner screen", () => {
    expect(sessionKind("Leitner")).toBe("leitner");
  });

  it("falls back to none for a card with no technique", () => {
    expect(sessionKind(null)).toBe("none");
  });
});
