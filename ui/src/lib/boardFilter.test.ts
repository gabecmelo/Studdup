import { describe, expect, it } from "vitest";
import { filterBoardCards } from "./boardFilter";

type Row = { title: string; technique: "Pomodoro" | "Feynman" | null };

const cards: Row[] = [
  { title: "Genética — 2ª Lei de Mendel", technique: "Pomodoro" },
  { title: "Citologia — organelas", technique: "Feynman" },
  { title: "Ecologia — ciclos", technique: null },
];

describe("filterBoardCards", () => {
  it("returns all cards when no filter is set (same array identity, no copy)", () => {
    expect(filterBoardCards(cards, "", null)).toBe(cards);
    expect(filterBoardCards(cards, "   ", null)).toBe(cards);
  });

  it("matches the title case-insensitively and ignores surrounding whitespace", () => {
    expect(filterBoardCards(cards, "  GENÉTICA ", null).map((c) => c.title)).toEqual([
      "Genética — 2ª Lei de Mendel",
    ]);
  });

  it("narrows to a single technique", () => {
    expect(filterBoardCards(cards, "", "Feynman").map((c) => c.title)).toEqual([
      "Citologia — organelas",
    ]);
  });

  it("excludes cards without a technique when one is selected", () => {
    expect(filterBoardCards(cards, "", "Pomodoro").every((c) => c.technique === "Pomodoro")).toBe(true);
  });

  it("applies search and technique together (AND)", () => {
    expect(filterBoardCards(cards, "cito", "Pomodoro")).toEqual([]);
    expect(filterBoardCards(cards, "cito", "Feynman").map((c) => c.title)).toEqual([
      "Citologia — organelas",
    ]);
  });
});
