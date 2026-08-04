// Pure drag resolver for the kanban board (KAN-02/03, AD-004). Given the column a card was
// dragged FROM and the column it was dropped ON (or `null` when released outside any column),
// decide what should happen — with zero React or dnd-kit dependency so the board (T23) and its
// tests share the exact same decision logic:
//
//   - Hoje → Amanhã (and any move to a later/earlier day column) = reschedule (postpone by the
//     day delta; Hoje→Amanhã is +1, KAN-02 §3).
//   - → Concluídos = complete the current session (same transition as Complete, KAN-03 §4).
//   - dropped on the same column = no-op: no mutation, no history event (KAN-01 §5).
//   - released outside any column = revert to origin, no change (spec edge case).

import type { Column } from "../components/columns";

/** Day anchor per schedulable column — the basis for a reschedule's day delta. */
const COLUMN_ANCHOR_DAYS: Record<Exclude<Column, "concluidos">, number> = {
  hoje: 0,
  amanha: 1,
  proximos: 2,
};

/** The decided outcome of a drag. Only `postpone`/`complete` issue a command. */
export type DragResolution =
  | { kind: "noop"; reason: "same-column" | "outside" }
  | { kind: "postpone"; days: number; to: Column }
  | { kind: "complete"; to: "concluidos" };

/**
 * Resolve a drag from `from` to `to` (`null` = dropped outside any column).
 *
 * A `noop` result means the board must issue no command and record no event (KAN-01 §5, edge
 * case). `postpone`/`complete` carry the target column so the board can show the card there
 * optimistically before the command settles.
 */
export function resolveDrag(from: Column, to: Column | null): DragResolution {
  if (to === null) return { kind: "noop", reason: "outside" };
  if (to === from) return { kind: "noop", reason: "same-column" };
  if (to === "concluidos") return { kind: "complete", to: "concluidos" };
  // A reschedule between day columns: postpone by the difference of their day anchors
  // (Hoje→Amanhã = +1; a backward move is a negative delta = brought forward).
  const days = COLUMN_ANCHOR_DAYS[to] - COLUMN_ANCHOR_DAYS[from as Exclude<Column, "concluidos">];
  return { kind: "postpone", days, to };
}

/** Whether a resolution issues a backend command (vs. a no-op that changes nothing). */
export function isMutating(resolution: DragResolution): boolean {
  return resolution.kind !== "noop";
}

/** Optimistic override map: card id → the column it is shown in while its mutation is pending. */
export type OptimisticMoves = Readonly<Record<number, Column>>;

/** Record an optimistic move so the card renders in its target column before the command settles. */
export function applyOptimisticMove(
  moves: OptimisticMoves,
  cardId: number,
  column: Column,
): OptimisticMoves {
  return { ...moves, [cardId]: column };
}

/** Drop a card's optimistic override — used on command error (rollback) and after a refetch. */
export function rollbackMove(moves: OptimisticMoves, cardId: number): OptimisticMoves {
  if (!(cardId in moves)) return moves;
  const next = { ...moves };
  delete next[cardId];
  return next;
}
