// T48 — self-rating scale (TECH-06): the three-point scale maps Não lembrei / Parcial / Sólido to the
// 0/1/2 stored on the history event, in ascending order of retrieval strength.

import { describe, expect, it } from "vitest";
import { SELF_RATING, SELF_RATING_VALUES, selfRatingDot } from "./selfRating";

describe("SELF_RATING", () => {
  it("has exactly three rungs", () => {
    expect(SELF_RATING).toHaveLength(3);
  });

  it("maps the three points to 0/1/2 in ascending strength", () => {
    expect(SELF_RATING.map((o) => o.value)).toEqual([0, 1, 2]);
    expect(SELF_RATING[0].label).toBe("Não lembrei");
    expect(SELF_RATING[1].label).toBe("Parcial");
    expect(SELF_RATING[2].label).toBe("Sólido");
  });

  it("gives every rung a label and a consequence note", () => {
    for (const o of SELF_RATING) {
      expect(o.label.length).toBeGreaterThan(0);
      expect(o.note.length).toBeGreaterThan(0);
    }
  });

  it("exposes the ordered value list", () => {
    expect(SELF_RATING_VALUES).toEqual([0, 1, 2]);
  });
});

describe("selfRatingDot", () => {
  it("maps each tone to a distinct color var", () => {
    const dots = new Set(SELF_RATING.map((o) => selfRatingDot(o.tone)));
    expect(dots.size).toBe(3);
  });
});
