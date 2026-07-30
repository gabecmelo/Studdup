// T52 — session dispatch (TECH-04/05): each technique maps to its guided session screen; no-technique
// and the not-yet-supported Leitner fall back to the plain "none" session (Leitner's arm ships in T57).

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

  it("falls back to none for a card with no technique", () => {
    expect(sessionKind(null)).toBe("none");
  });

  it("falls back to none for Leitner until its screen ships (T57)", () => {
    expect(sessionKind("Leitner")).toBe("none");
  });
});
