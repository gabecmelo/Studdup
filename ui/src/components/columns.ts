// Pure kanban column placement (KAN-01). The board renders four columns and places each card by
// comparing its due date to today; overdue cards fall into "Hoje", archived cards into
// "Concluídos". Kept here as a pure, tz-independent helper so the board (T22) and its tests reuse
// it without a React dependency.

import type { ISODate } from "../lib/bindings";

export type Column = "hoje" | "amanha" | "proximos" | "concluidos";

/** Human labels for each column (Portuguese, matching the handoff). */
export const COLUMN_LABELS: Record<Column, string> = {
  hoje: "Hoje",
  amanha: "Amanhã",
  proximos: "Próximos",
  concluidos: "Concluídos",
};

/** Column order, left to right. */
export const COLUMN_ORDER: readonly Column[] = [
  "hoje",
  "amanha",
  "proximos",
  "concluidos",
];

function toUtcMs(iso: ISODate): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

/** Whole days from `from` to `to` (`to - from`); tz/DST-independent (dates are calendar-only). */
export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / 86_400_000);
}

/** Column for a due date relative to today. Overdue **and** due-today both land in "Hoje". */
export function columnForDueDate(due: ISODate, today: ISODate): Column {
  const diff = daysBetween(today, due);
  if (diff <= 0) return "hoje";
  if (diff === 1) return "amanha";
  return "proximos";
}

/** Column for a card: archived → "Concluídos", otherwise placed by its due date (KAN-01). */
export function columnForCard(
  card: { archived: boolean; dueDate: ISODate },
  today: ISODate,
): Column {
  if (card.archived) return "concluidos";
  return columnForDueDate(card.dueDate, today);
}
