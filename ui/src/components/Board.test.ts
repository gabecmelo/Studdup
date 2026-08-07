import { describe, expect, it } from "vitest";
import type { Card } from "../lib/bindings";
import {
  STAGE_OFFSET,
  addDaysIso,
  boardGridColumns,
  placeAtDue,
  placeCard,
  spacedDueDate,
} from "./Board";

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

describe("STAGE_OFFSET", () => {
  it("maps each ladder stage to its day offset (AD-003)", () => {
    expect(STAGE_OFFSET.Day0).toBe(0);
    expect(STAGE_OFFSET.Day1).toBe(1);
    expect(STAGE_OFFSET.Day2).toBe(2);
    expect(STAGE_OFFSET.Day5).toBe(5);
    expect(STAGE_OFFSET.Day15).toBe(15);
    expect(STAGE_OFFSET.Day30).toBe(30);
    expect(STAGE_OFFSET.Done).toBe(-1);
  });
});

describe("addDaysIso", () => {
  it("adds whole days, crossing month and year boundaries", () => {
    expect(addDaysIso("2026-05-01", 5)).toBe("2026-05-06");
    expect(addDaysIso("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDaysIso("2026-12-31", 1)).toBe("2027-01-01");
    // 2024 is a leap year.
    expect(addDaysIso("2024-02-28", 1)).toBe("2024-02-29");
  });
});

describe("boardGridColumns (responsive container reflow, RWD-02/RWD-03)", () => {
  it("keeps the four-wide grid on desktop (no regression, RWD-07)", () => {
    expect(boardGridColumns("desktop")).toBe("repeat(4, minmax(0, 1fr))");
  });

  it("uses a two-column grid on tablet (RWD-03)", () => {
    expect(boardGridColumns("tablet")).toBe("repeat(2, minmax(0, 1fr))");
  });

  it("collapses to a single stacked column on phone (RWD-02)", () => {
    expect(boardGridColumns("phone")).toBe("minmax(0, 1fr)");
  });
});

describe("placeAtDue (method-agnostic placement by a resolved due date, AD-014)", () => {
  it("places a card due today in Hoje with no overdue", () => {
    const p = placeAtDue(false, TODAY, TODAY);
    expect(p.column).toBe("hoje");
    expect(p.overdueDays).toBe(0);
  });

  it("places a card due tomorrow in Amanhã", () => {
    expect(placeAtDue(false, addDaysIso(TODAY, 1), TODAY).column).toBe("amanha");
  });

  it("places a card due in two days in Próximos", () => {
    expect(placeAtDue(false, addDaysIso(TODAY, 2), TODAY).column).toBe("proximos");
  });

  it("places an overdue card in Hoje and reports whole days overdue", () => {
    const p = placeAtDue(false, addDaysIso(TODAY, -3), TODAY);
    expect(p.column).toBe("hoje");
    expect(p.overdueDays).toBe(3);
  });

  it("advances an exam card to the next column when its cursor due date moves forward", () => {
    // Session 1 due today → Hoje; after completion the cursor due date is +5 → Próximos. This is
    // the exam-completion fix: the card must move, not freeze at creation.
    expect(placeAtDue(false, TODAY, TODAY).column).toBe("hoje");
    expect(placeAtDue(false, addDaysIso(TODAY, 5), TODAY).column).toBe("proximos");
  });

  it("places a card with no live due date (archived or fully studied) in Concluídos", () => {
    expect(placeAtDue(true, addDaysIso(TODAY, -9), TODAY).column).toBe("concluidos");
    expect(placeAtDue(true, addDaysIso(TODAY, -9), TODAY).overdueDays).toBe(0);
    expect(placeAtDue(false, null, TODAY).column).toBe("concluidos");
  });
});

describe("spacedDueDate", () => {
  it("derives the due date as start_date + stage offset (dueDate = startDate + stage, AD-003)", () => {
    expect(spacedDueDate("2026-05-01", "Day0")).toBe("2026-05-01");
    expect(spacedDueDate("2026-05-01", "Day1")).toBe("2026-05-02");
    expect(spacedDueDate("2026-05-01", "Day5")).toBe("2026-05-06");
    expect(spacedDueDate("2026-05-01", "Day30")).toBe("2026-05-31");
  });
});

describe("placeCard", () => {
  it("places a Day0 card started today in Hoje with no overdue", () => {
    const p = placeCard(card({ start_date: TODAY, current_stage: "Day0" }), TODAY);
    expect(p.column).toBe("hoje");
    expect(p.overdueDays).toBe(0);
  });

  it("places a Day1 card started today in Amanhã (due tomorrow)", () => {
    const p = placeCard(card({ start_date: TODAY, current_stage: "Day1" }), TODAY);
    expect(p.column).toBe("amanha");
    expect(p.overdueDays).toBe(0);
  });

  it("places a Day2 card started today in Próximos (due in two days)", () => {
    const p = placeCard(card({ start_date: TODAY, current_stage: "Day2" }), TODAY);
    expect(p.column).toBe("proximos");
  });

  it("places a Day5 card started today in Próximos", () => {
    const p = placeCard(card({ start_date: TODAY, current_stage: "Day5" }), TODAY);
    expect(p.column).toBe("proximos");
  });

  it("places an overdue card in Hoje and reports whole days overdue", () => {
    // Day0 anchored three days ago: due date is three days ago → overdue.
    const p = placeCard(card({ start_date: "2026-04-28", current_stage: "Day0" }), TODAY);
    expect(p.column).toBe("hoje");
    expect(p.overdueDays).toBe(3);
  });

  it("computes overdue from the derived due date, not the raw start date", () => {
    // Day1 anchored five days ago: due date is start+1 = four days ago → four days overdue.
    const p = placeCard(card({ start_date: "2026-04-26", current_stage: "Day1" }), TODAY);
    expect(p.column).toBe("hoje");
    expect(p.overdueDays).toBe(4);
  });

  it("always places an archived card in Concluídos with no overdue badge", () => {
    const p = placeCard(
      card({ archived: true, start_date: "2026-04-01", current_stage: "Day5" }),
      TODAY,
    );
    expect(p.column).toBe("concluidos");
    expect(p.overdueDays).toBe(0);
  });
});
