// Pure history filter/count logic for the Histórico screen (HIST-01/02/03). The screen fetches the
// unified event log once and filters it client-side so the "Este método" / "Geral" tabs and the
// method/technique filters can show a live result count without refetching. Kept JSX-free so the
// filter and count rules are unit-tested directly.

import type { HistoryEvent, Method, Technique } from "../lib/bindings";

/** A history query: `null` on a field means "any" (the unified/unfiltered view, HIST-02). */
export interface HistoryQuery {
  method: Method | null;
  technique: Technique | null;
}

/**
 * Filter events to those matching the query (HIST-03): a non-null `method`/`technique` narrows to
 * that value; `null` matches everything on that axis. The two conditions are ANDed.
 */
export function filterHistory(events: HistoryEvent[], q: HistoryQuery): HistoryEvent[] {
  return events.filter(
    (e) =>
      (q.method === null || e.method === q.method) &&
      (q.technique === null || e.technique === q.technique),
  );
}

/** The result count for a query — what the screen shows beside the filters (HIST-03). */
export function historyCount(events: HistoryEvent[], q: HistoryQuery): number {
  return filterHistory(events, q).length;
}

/**
 * Whether a history row represents a study that reached its end and can be revived (HIST-05): a
 * spaced card completed to `Done`, or an explicit `archived` event. An in-progress completion (e.g.
 * advancing to Day 1) is not revivable — the card is still active.
 */
export function isRevivable(event: HistoryEvent): boolean {
  return event.to_stage === "Done" || event.kind === "archived";
}
