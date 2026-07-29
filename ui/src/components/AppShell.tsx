// App shell (AD-009): a left sidebar that collapses to an icon rail, with the method switcher
// promoted OUT of the sidebar to the top of the board content area (so it stays fully legible even
// when the sidebar is collapsed). Collapse state persists across sessions, the sidebar
// auto-collapses below ~1024px, and a keyboard shortcut (Ctrl/⌘+B) toggles it.

import { useCallback, useEffect, useState } from "react";
import { MethodSwitcher } from "./MethodSwitcher";
import { toggleTheme } from "../styles/theme";
import { DEFAULT_ROUTE, ROUTES, RouteView, type RouteKey } from "../routes";
import { useStore } from "../store";

const COLLAPSE_KEY = "studdup.sidebar.collapsed";
const AUTO_COLLAPSE_WIDTH = 1024;

const EXPANDED_WIDTH = 248;
const RAIL_WIDTH = 68;

/** Persisted user preference for the sidebar (independent of the responsive auto-collapse). */
function readCollapsedPref(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(COLLAPSE_KEY) === "1";
}

function writeCollapsedPref(collapsed: boolean): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }
}

/** Routes that show the promoted method switcher above their content. */
const METHOD_SCOPED: ReadonlySet<RouteKey> = new Set<RouteKey>(["quadro", "historico"]);

export function AppShell() {
  const [collapsedPref, setCollapsedPref] = useState<boolean>(readCollapsedPref);
  const [narrow, setNarrow] = useState<boolean>(
    () => typeof window !== "undefined" && window.innerWidth < AUTO_COLLAPSE_WIDTH,
  );
  const [route, setRoute] = useState<RouteKey>(DEFAULT_ROUTE);
  // The active method lives in the store (persisted, METH-02) so the promoted switcher and the
  // board (which reads the same store) stay in sync.
  const method = useStore((s) => s.activeMethod);
  const setMethod = useStore((s) => s.setActiveMethod);

  // Effective collapse: forced when the viewport is narrow, otherwise the user's preference.
  const collapsed = narrow || collapsedPref;

  const toggleCollapse = useCallback(() => {
    setCollapsedPref((prev) => {
      const next = !prev;
      writeCollapsedPref(next);
      return next;
    });
  }, []);

  // Auto-collapse below the width threshold (AD-009).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setNarrow(window.innerWidth < AUTO_COLLAPSE_WIDTH);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Keyboard shortcut: Ctrl/⌘+B toggles the sidebar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCollapse]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar
        collapsed={collapsed}
        canToggle={!narrow}
        route={route}
        onNavigate={setRoute}
        onToggle={toggleCollapse}
      />

      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          padding: 28,
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <h1 style={{ margin: 0, font: "600 24px/1.2 var(--font-sans)", letterSpacing: "-.02em" }}>
            {ROUTES.find((r) => r.key === route)?.label}
          </h1>
          {/* Method switcher lives in the content area, never in the collapsing sidebar (AD-009). */}
          {METHOD_SCOPED.has(route) && (
            <MethodSwitcher value={method} onChange={setMethod} />
          )}
        </header>

        <section style={{ flex: 1, minHeight: 0 }}>
          <RouteView route={route} />
        </section>
      </main>
    </div>
  );
}

interface SidebarProps {
  collapsed: boolean;
  canToggle: boolean;
  route: RouteKey;
  onNavigate: (route: RouteKey) => void;
  onToggle: () => void;
}

function Sidebar({ collapsed, canToggle, route, onNavigate, onToggle }: SidebarProps) {
  return (
    <nav
      aria-label="Navegação principal"
      style={{
        width: collapsed ? RAIL_WIDTH : EXPANDED_WIDTH,
        flex: "none",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 12,
        borderRight: "1px solid var(--border)",
        background: "var(--surface)",
        transition: "width var(--transition)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: "8px 8px 12px",
        }}
      >
        {!collapsed && (
          <span style={{ font: "700 18px/1 var(--font-sans)", letterSpacing: "-.02em" }}>
            Studdup
          </span>
        )}
        {canToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            title="Recolher menu (Ctrl+B)"
            style={{
              font: "600 14px/1 var(--font-sans)",
              width: 32,
              height: 32,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-2)",
              cursor: "pointer",
            }}
          >
            {collapsed ? "»" : "«"}
          </button>
        )}
      </div>

      <button
        type="button"
        title="Novo Card"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: collapsed ? "10px 0" : "11px 14px",
          borderRadius: "var(--radius-pill)",
          border: "none",
          cursor: "pointer",
          background: "var(--accent)",
          color: "var(--accent-ink)",
          font: "600 13.5px/1 var(--font-sans)",
          boxShadow: "var(--shadow-1)",
        }}
      >
        <span aria-hidden>＋</span>
        {!collapsed && "Novo Card"}
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
        {ROUTES.map((item) => {
          const active = item.key === route;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                justifyContent: collapsed ? "center" : "flex-start",
                padding: collapsed ? "10px 0" : "10px 12px",
                borderRadius: "var(--radius-md)",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                font: "600 13.5px/1 var(--font-sans)",
                background: active ? "var(--accent-soft)" : "transparent",
                color: active ? "var(--accent-soft-ink)" : "var(--text-2)",
              }}
            >
              <span aria-hidden style={{ width: 18, textAlign: "center" }}>
                {item.icon}
              </span>
              {!collapsed && item.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => toggleTheme()}
        title="Alternar tema"
        style={{
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 12,
          padding: collapsed ? "10px 0" : "10px 12px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          background: "transparent",
          color: "var(--text-2)",
          cursor: "pointer",
          font: "600 13px/1 var(--font-sans)",
        }}
      >
        <span aria-hidden style={{ width: 18, textAlign: "center" }}>
          ☾
        </span>
        {!collapsed && "Tema"}
      </button>
    </nav>
  );
}
