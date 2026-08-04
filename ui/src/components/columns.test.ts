import { describe, expect, it } from "vitest";
import {
  columnForCard,
  columnForDueDate,
  daysBetween,
} from "./columns";

const TODAY = "2026-05-01";

describe("daysBetween", () => {
  it("counts whole calendar days in both directions", () => {
    expect(daysBetween("2026-05-01", "2026-05-04")).toBe(3);
    expect(daysBetween("2026-05-04", "2026-05-01")).toBe(-3);
    expect(daysBetween("2026-05-01", "2026-05-01")).toBe(0);
  });

  it("crosses month and year boundaries correctly", () => {
    expect(daysBetween("2026-01-31", "2026-02-01")).toBe(1);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
    // 2024 is a leap year: Feb has 29 days.
    expect(daysBetween("2024-02-28", "2024-03-01")).toBe(2);
  });
});

describe("columnForDueDate", () => {
  it("places a card due today in Hoje", () => {
    expect(columnForDueDate(TODAY, TODAY)).toBe("hoje");
  });

  it("places an overdue card in Hoje (past due dates count as today)", () => {
    expect(columnForDueDate("2026-04-28", TODAY)).toBe("hoje");
    expect(columnForDueDate("2026-04-01", TODAY)).toBe("hoje");
  });

  it("places a card due tomorrow in Amanhã", () => {
    expect(columnForDueDate("2026-05-02", TODAY)).toBe("amanha");
  });

  it("places a card due later than tomorrow in Próximos", () => {
    expect(columnForDueDate("2026-05-03", TODAY)).toBe("proximos");
    expect(columnForDueDate("2026-06-01", TODAY)).toBe("proximos");
  });
});

describe("columnForCard", () => {
  it("always places an archived card in Concluídos, ignoring its due date", () => {
    expect(
      columnForCard({ archived: true, dueDate: TODAY }, TODAY),
    ).toBe("concluidos");
    expect(
      columnForCard({ archived: true, dueDate: "2026-04-01" }, TODAY),
    ).toBe("concluidos");
  });

  it("places an active card by its due date", () => {
    expect(columnForCard({ archived: false, dueDate: TODAY }, TODAY)).toBe("hoje");
    expect(
      columnForCard({ archived: false, dueDate: "2026-05-02" }, TODAY),
    ).toBe("amanha");
    expect(
      columnForCard({ archived: false, dueDate: "2026-05-09" }, TODAY),
    ).toBe("proximos");
  });
});
