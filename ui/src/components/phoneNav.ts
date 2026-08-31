// How the six routes split across the phone tab bar (RWD-05). A thumb-sized tab needs ~64px, so a
// 360px phone fits five slots — and one of them is the "Novo Card" action. Cramming all six routes
// in produced 9.5px labels that truncated ("Config…"), so the bar carries the three routes you use
// while studying plus an overflow tab, and the reference screens (Técnicas, Ajuda, Configurações)
// live one tap away in the "Mais" sheet.
//
// Pure data + predicates so the split is unit-testable without rendering.

import { ROUTES, type RouteKey, type RouteMeta } from "../routes";

/** The routes that get their own tab in the bottom bar — the day-to-day study loop. */
export const PHONE_TAB_ROUTES: readonly RouteKey[] = ["inicio", "quadro", "historico"];

/** The routes folded behind the "Mais" tab — reference material, not part of a study session. */
export const PHONE_MORE_ROUTES: readonly RouteKey[] = ["tecnicas", "ajuda", "configuracoes"];

function metaFor(key: RouteKey): RouteMeta {
  const meta = ROUTES.find((r) => r.key === key);
  if (!meta) throw new Error(`unknown route: ${key}`);
  return meta;
}

/** The bar's own tabs, in order, with their labels/icons. */
export const PHONE_TABS: readonly RouteMeta[] = PHONE_TAB_ROUTES.map(metaFor);

/** The "Mais" sheet's rows, in order. */
export const PHONE_MORE: readonly RouteMeta[] = PHONE_MORE_ROUTES.map(metaFor);

/** Whether a route lives in the "Mais" sheet — i.e. whether the "Mais" tab should read as active. */
export function isMoreRoute(route: RouteKey): boolean {
  return PHONE_MORE_ROUTES.includes(route);
}
