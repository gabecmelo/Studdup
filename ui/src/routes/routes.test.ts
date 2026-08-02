// T39 (HOME-01): the app must land on Início. These are pure-value / structural assertions —
// no rendering — so they don't need a React Query provider or a Tauri invoke mock.

import { describe, expect, it } from "vitest";
import { isValidElement } from "react";
import { DEFAULT_ROUTE, RouteView } from ".";
import { Inicio } from "./Inicio";

describe("app routing", () => {
  it("lands on Início by default (HOME-01)", () => {
    expect(DEFAULT_ROUTE).toBe("inicio");
  });

  it("RouteView('inicio') renders the Início screen", () => {
    const element = RouteView({ route: "inicio", theme: "dark", onChooseTheme: () => {} });
    expect(isValidElement(element)).toBe(true);
    // The returned element is `<Inicio .../>` — its component type is the Início screen.
    expect((element as { type: unknown }).type).toBe(Inicio);
  });
});
