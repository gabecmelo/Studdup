import { describe, expect, it } from "vitest";
import type { Card } from "./bindings";
import { firstDueCard } from "./dueCards";

// A minimal spaced card fixture; only the fields the placement helpers read matter.
function card(over: Partial<Card>): Card {
  return {
    id: 1,
    title: "t",
    content_link: "",
    review_link: "",
    method: "SpacedRepetition",
    technique: null,
    est_minutes: null,
    pomodoro: null,
    start_date: "2026-05-01",
    current_stage: "Day0",
    exam_id: null,
    created_at: "2026-05-01",
    last_completed_at: null,
    archived: false,
    ...over,
  };
}

const TODAY = "2026-05-01";

describe("firstDueCard", () => {
  it("returns null when there are no cards", () => {
    expect(firstDueCard([], TODAY)).toBeNull();
  });

  it("returns null when nothing is due today (all in later columns)", () => {
    const cards = [
      card({ id: 1, current_stage: "Day1" }), // Amanhã
      card({ id: 2, current_stage: "Day5" }), // Próximos
    ];
    expect(firstDueCard(cards, TODAY)).toBeNull();
  });

  it("picks a card due today", () => {
    const cards = [
      card({ id: 1, current_stage: "Day5" }), // Próximos
      card({ id: 2, current_stage: "Day0" }), // Hoje
    ];
    expect(firstDueCard(cards, TODAY)?.id).toBe(2);
  });

  it("prefers the most overdue card over one merely due today", () => {
    const cards = [
      card({ id: 1, start_date: TODAY, current_stage: "Day0" }), // due today
      card({ id: 2, start_date: "2026-04-25", current_stage: "Day0" }), // 6 days overdue
    ];
    expect(firstDueCard(cards, TODAY)?.id).toBe(2);
  });

  it("picks the soonest-due among several overdue cards", () => {
    const cards = [
      card({ id: 1, start_date: "2026-04-20", current_stage: "Day0" }), // due 2026-04-20
      card({ id: 2, start_date: "2026-04-28", current_stage: "Day0" }), // due 2026-04-28
    ];
    // "Soonest due" = earliest due date = the one anchored further back.
    expect(firstDueCard(cards, TODAY)?.id).toBe(1);
  });

  it("ignores archived cards even if their derived due date is today", () => {
    const cards = [card({ id: 1, archived: true, current_stage: "Day0" })];
    expect(firstDueCard(cards, TODAY)).toBeNull();
  });
});
