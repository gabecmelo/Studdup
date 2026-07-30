// Route registry for the app shell (T20). The real screens are built in later tasks — the kanban
// board (T22+), exam screens (T30), history (T34), techniques catalog (P2), settings (T31). Here
// each route is a lightweight placeholder so the shell's navigation is wired and the app loads.

import type { ReactNode } from "react";
import { Quadro } from "./Quadro";
import { Configuracoes } from "./Configuracoes";
import { Historico } from "./Historico";
import { Inicio } from "./Inicio";
import { Tecnicas } from "./Tecnicas";
import { Ajuda } from "./Ajuda";

export type RouteKey =
  | "inicio"
  | "quadro"
  | "historico"
  | "tecnicas"
  | "ajuda"
  | "configuracoes";

export interface RouteMeta {
  key: RouteKey;
  label: string;
  icon: string;
}

/** Navigation order (AD-009): Início, Quadro, Histórico, Técnicas, Ajuda, Configurações. */
export const ROUTES: readonly RouteMeta[] = [
  { key: "inicio", label: "Início", icon: "◇" },
  { key: "quadro", label: "Quadro", icon: "▦" },
  { key: "historico", label: "Histórico", icon: "◷" },
  { key: "tecnicas", label: "Técnicas", icon: "◈" },
  { key: "ajuda", label: "Ajuda", icon: "?" },
  { key: "configuracoes", label: "Configurações", icon: "⚙" },
] as const;

export const DEFAULT_ROUTE: RouteKey = "quadro";

/** Render a route's content. `onNavigate` lets a screen jump to another route (e.g. Início's CTA
 *  opens the board). All six routes are live screens. */
export function RouteView({
  route,
  onNavigate,
}: {
  route: RouteKey;
  onNavigate?: (route: RouteKey) => void;
}): ReactNode {
  switch (route) {
    case "inicio":
      return <Inicio onNavigate={onNavigate} />;
    case "quadro":
      return <Quadro />;
    case "historico":
      return <Historico />;
    case "tecnicas":
      return <Tecnicas />;
    case "ajuda":
      return <Ajuda onNavigate={onNavigate} />;
    case "configuracoes":
      return <Configuracoes />;
  }
}
