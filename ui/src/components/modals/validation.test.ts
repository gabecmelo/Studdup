import { describe, expect, it } from "vitest";
import { TITLE_MAX, titleCharCount, validateTitle } from "./validation";

describe("validateTitle", () => {
  it("rejects an empty title (spec edge case: empty/whitespace title)", () => {
    const result = validateTitle("");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe("empty");
  });

  it("rejects a whitespace-only title", () => {
    const result = validateTitle("   \t \n ");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe("empty");
  });

  it("accepts a normal title", () => {
    expect(validateTitle("Genética — 2ª Lei de Mendel")).toEqual({ valid: true });
  });

  it("accepts a title of exactly 200 characters (the inclusive bound)", () => {
    expect(validateTitle("a".repeat(TITLE_MAX))).toEqual({ valid: true });
  });

  it("rejects a title of 201 characters (spec edge case: > 200 chars)", () => {
    const result = validateTitle("a".repeat(TITLE_MAX + 1));
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe("too-long");
      expect(result.message).toContain("200");
    }
  });

  it("does not trim the length check — leading/trailing spaces count toward the limit", () => {
    // 200 non-space chars + surrounding spaces exceeds the bound.
    const result = validateTitle(` ${"a".repeat(TITLE_MAX)} `);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.code).toBe("too-long");
  });
});

describe("titleCharCount", () => {
  it("counts by Unicode code points, not UTF-16 units (matches Rust chars().count())", () => {
    // "é" as a single code point and an emoji each count as 1.
    expect(titleCharCount("café")).toBe(4);
    expect(titleCharCount("🎓")).toBe(1);
  });
});
