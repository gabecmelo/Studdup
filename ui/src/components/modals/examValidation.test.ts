import { describe, expect, it } from "vitest";
import { EXAM_MAX_YEARS, maxExamDate, validateExamDate } from "./examValidation";

const TODAY = "2026-07-29";

describe("validateExamDate", () => {
  it("rejects an empty date", () => {
    const r = validateExamDate("", TODAY);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.code).toBe("empty");
  });

  it("rejects a date in the past (spec: today or later)", () => {
    const r = validateExamDate("2026-07-28", TODAY);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.code).toBe("past");
  });

  it("accepts today itself (inclusive lower bound)", () => {
    expect(validateExamDate(TODAY, TODAY)).toEqual({ valid: true });
  });

  it("accepts a near-future date", () => {
    expect(validateExamDate("2026-11-08", TODAY)).toEqual({ valid: true });
  });

  it("accepts a date exactly 5 years out (inclusive upper bound)", () => {
    expect(validateExamDate("2031-07-29", TODAY)).toEqual({ valid: true });
  });

  it("rejects a date more than 5 years out (spec edge case: > 5 years)", () => {
    const r = validateExamDate("2031-07-30", TODAY);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.code).toBe("too-far");
  });
});

describe("maxExamDate", () => {
  it("is exactly EXAM_MAX_YEARS calendar years ahead", () => {
    expect(maxExamDate(TODAY)).toBe("2031-07-29");
    expect(EXAM_MAX_YEARS).toBe(5);
  });

  it("clamps a Feb-29 anchor to Feb-28 when the target year is not a leap year", () => {
    // 2024 is a leap year; 2024 + 5 = 2029 is not, so Feb 29 clamps to Feb 28.
    expect(maxExamDate("2024-02-29")).toBe("2029-02-28");
  });
});
