// Pure "what to study now" pick (HOME-04). Given a method's board cards and today, return the one
// card the "Estudar agora" flow should open: the earliest-due active card in the "Hoje" column
// (overdue cards live there too, KAN-01). `null` when nothing is due — the caller must NOT fabricate
// work (HOME-04/06). Reuses the board's own `placeCard` so the definition of "due today" is shared.

import type { Card, ISODate } from "./bindings";
import { placeCard } from "../components/Board";

/** The first card to study now: earliest-due, non-archived, in the "Hoje" column. `null` if none. */
export function firstDueCard(cards: Card[], today: ISODate): Card | null {
  const due = cards.filter(
    (c) => !c.archived && placeCard(c, today).column === "hoje",
  );
  if (due.length === 0) return null;
  // Earliest derived due date wins (most overdue / soonest first); ties keep the first seen.
  return due.reduce((best, c) =>
    placeCard(c, today).dueDate < placeCard(best, today).dueDate ? c : best,
  );
}
