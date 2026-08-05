// Board header filters (KAN) — the search box and technique dropdown narrow the visible cards on the
// board without refetching. Pure so it is trivially testable and shared by both the spaced board and
// the Prova board.

import type { Card, Technique } from "./bindings";

/** Keep the cards whose title contains `search` (case-insensitive) and match `technique` (when set). */
export function filterBoardCards<T extends Pick<Card, "title" | "technique">>(
  cards: T[],
  search: string,
  technique: Technique | null,
): T[] {
  const q = search.trim().toLowerCase();
  if (!q && !technique) return cards;
  return cards.filter((c) => {
    if (technique && c.technique !== technique) return false;
    if (q && !c.title.toLowerCase().includes(q)) return false;
    return true;
  });
}
