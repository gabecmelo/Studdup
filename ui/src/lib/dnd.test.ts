import { describe, expect, it } from "vitest";
import {
  applyOptimisticMove,
  isMutating,
  resolveDrag,
  rollbackMove,
} from "./dnd";

describe("resolveDrag", () => {
  it("reschedules Hoje → Amanhã as postpone +1 day (KAN-02 §3)", () => {
    const r = resolveDrag("hoje", "amanha");
    expect(r).toEqual({ kind: "postpone", days: 1, to: "amanha" });
  });

  it("completes a card dropped into Concluídos, from any column (KAN-03 §4)", () => {
    expect(resolveDrag("hoje", "concluidos")).toEqual({ kind: "complete", to: "concluidos" });
    expect(resolveDrag("proximos", "concluidos")).toEqual({
      kind: "complete",
      to: "concluidos",
    });
  });

  it("is a no-op when dropped on the same column — no mutation, no event (KAN-01 §5)", () => {
    const r = resolveDrag("hoje", "hoje");
    expect(r).toEqual({ kind: "noop", reason: "same-column" });
    expect(isMutating(r)).toBe(false);
  });

  it("reverts (no-op) when released outside any column (edge case)", () => {
    const r = resolveDrag("hoje", null);
    expect(r).toEqual({ kind: "noop", reason: "outside" });
    expect(isMutating(r)).toBe(false);
  });

  it("brings a card forward with a negative delta when moved to an earlier column", () => {
    expect(resolveDrag("amanha", "hoje")).toEqual({ kind: "postpone", days: -1, to: "hoje" });
    expect(resolveDrag("proximos", "hoje")).toEqual({ kind: "postpone", days: -2, to: "hoje" });
  });

  it("flags postpone and complete as mutating", () => {
    expect(isMutating(resolveDrag("hoje", "amanha"))).toBe(true);
    expect(isMutating(resolveDrag("hoje", "concluidos"))).toBe(true);
  });
});

describe("optimistic move + rollback", () => {
  it("records an optimistic move so the card shows in its target column", () => {
    const moves = applyOptimisticMove({}, 7, "amanha");
    expect(moves[7]).toBe("amanha");
  });

  it("rolls the move back on command error, returning the card to its origin", () => {
    const moved = applyOptimisticMove({}, 7, "amanha");
    const reverted = rollbackMove(moved, 7);
    expect(reverted[7]).toBeUndefined();
  });

  it("leaves other cards' optimistic moves intact when rolling one back", () => {
    let moves = applyOptimisticMove({}, 7, "amanha");
    moves = applyOptimisticMove(moves, 9, "concluidos");
    const reverted = rollbackMove(moves, 7);
    expect(reverted[7]).toBeUndefined();
    expect(reverted[9]).toBe("concluidos");
  });

  it("is a no-op to roll back a card that was never moved", () => {
    const moves = applyOptimisticMove({}, 7, "amanha");
    expect(rollbackMove(moves, 999)).toBe(moves);
  });
});
