// The phone tab bar's route split (RWD-05). The bar has five slots and one is the "Novo Card"
// action, so the six routes cannot all be tabs — these lock in that the split stays exhaustive
// (nothing becomes unreachable on phone) and correctly sized.

import { describe, expect, it } from "vitest";
import { ROUTES } from "../routes";
import { PHONE_MORE, PHONE_MORE_ROUTES, PHONE_TABS, PHONE_TAB_ROUTES, isMoreRoute } from "./phoneNav";

describe("phone navigation split", () => {
  it("covers every route exactly once — nothing is unreachable on phone", () => {
    const covered = [...PHONE_TAB_ROUTES, ...PHONE_MORE_ROUTES].sort();
    const all = ROUTES.map((r) => r.key).sort();
    expect(covered).toEqual(all);
  });

  it("leaves room for the Novo Card slot: at most 4 tabs in the bar", () => {
    // 4 tabs + the centre action = 5 slots, the most a 360px bar fits at a legible label size.
    expect(PHONE_TABS.length).toBeLessThanOrEqual(4);
  });

  it("keeps the study loop (Início, Quadro, Histórico) one tap away", () => {
    expect(PHONE_TAB_ROUTES).toEqual(["inicio", "quadro", "historico"]);
  });

  it("resolves every route to its label so no tab renders blank", () => {
    for (const meta of [...PHONE_TABS, ...PHONE_MORE]) {
      expect(meta.label.length).toBeGreaterThan(0);
    }
  });

  it("marks the Mais tab active for the routes inside the sheet", () => {
    expect(isMoreRoute("configuracoes")).toBe(true);
    expect(isMoreRoute("tecnicas")).toBe(true);
    expect(isMoreRoute("ajuda")).toBe(true);
    expect(isMoreRoute("quadro")).toBe(false);
    expect(isMoreRoute("inicio")).toBe(false);
  });
});
