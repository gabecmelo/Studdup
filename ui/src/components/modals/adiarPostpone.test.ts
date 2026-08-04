import { describe, expect, it } from "vitest";
import { postponeDeltaDays } from "./Adiar";

// The postpone command adds the returned delta to the card's *current* due date. These assert the
// delta lands the schedule exactly on the chosen target, computed from the due date (not today), so
// an overdue card can never be sent into the past — the reported "Adiar pra amanhã cai ontem" bug.
describe("postponeDeltaDays", () => {
  it("returns the day gap from the current due date to the target", () => {
    expect(postponeDeltaDays("2026-08-03", "2026-08-04")).toBe(1);
    expect(postponeDeltaDays("2026-08-01", "2026-08-08")).toBe(7);
  });

  it("lands an overdue card on a future target with a positive delta", () => {
    // Card due 2026-08-01, today is 2026-08-03; user picks tomorrow (2026-08-04).
    // Delta 3 added to the 08-01 due date → 08-04, the chosen day — never the past.
    expect(postponeDeltaDays("2026-08-01", "2026-08-04")).toBe(3);
  });

  it("crosses month boundaries", () => {
    expect(postponeDeltaDays("2026-08-30", "2026-09-02")).toBe(3);
  });
});
