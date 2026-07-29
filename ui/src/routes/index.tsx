// Route registry for the app shell (T20). The real screens are built in later tasks — the kanban
// board (T22+), exam screens (T30), history (T34), techniques catalog (P2), settings (T31). Here
// each route is a lightweight placeholder so the shell's navigation is wired and the app loads.

import type { ReactNode } from "react";
import { EmptyState } from "../components/EmptyState";
import { Quadro } from "./Quadro";
import { Configuracoes } from "./Configuracoes";
import { Historico } from "./Historico";

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

const PLACEHOLDER: Record<RouteKey, { title: string; description: string }> = {
  inicio: {
    title: "Início",
    description: "A visão geral de tudo que está pra hoje aparece aqui (em breve).",
  },
  quadro: {
    title: "Seu quadro aparecerá aqui",
    description: "As colunas Hoje, Amanhã, Próximos e Concluídos chegam com o board.",
  },
  historico: {
    title: "Histórico",
    description: "Seus estudos concluídos ficam registrados aqui.",
  },
  tecnicas: {
    title: "Técnicas",
    description: "Um guia de cada técnica de estudo entra aqui.",
  },
  ajuda: {
    title: "Ajuda",
    description: "Atalhos e orientações do Studdup.",
  },
  configuracoes: {
    title: "Configurações",
    description: "Padrões de técnica, tema e dados do app.",
  },
};

/** Render a route's content. The Quadro board is live (T22); other screens stay placeholders
 *  until their tasks build them. */
export function RouteView({ route }: { route: RouteKey }): ReactNode {
  if (route === "quadro") return <Quadro />;
  if (route === "historico") return <Historico />;
  if (route === "configuracoes") return <Configuracoes />;
  const meta = PLACEHOLDER[route];
  return <EmptyState title={meta.title} description={meta.description} />;
}
