// App shell (AD-009): a left sidebar that collapses to an icon rail, with the method switcher
// promoted OUT of the sidebar to the top of the board content area (so it stays fully legible even
// when the sidebar is collapsed). Collapse state persists across sessions, the sidebar
// auto-collapses below ~1024px, and Ctrl/⌘+B toggles it.
//
// Styled 1:1 with the handoff (design/handoff/project/Quadro.dc.html): sidebar on var(--surface-2),
// the Studdup mark, "Novo Card" with --shadow-accent, CSS-shape nav icons, a Claro/Escuro theme pill
// and the "Offline" line; the collapsed rail is 66px with tooltips.

import { useCallback, useEffect, useState } from "react";
import { MethodSwitcher } from "./MethodSwitcher";
import {
  getStoredPreference,
  resolveTheme,
  setThemePreference,
  type Theme,
} from "../styles/theme";
import { DEFAULT_ROUTE, ROUTES, RouteView, type RouteKey } from "../routes";
import { useStore } from "../store";

const COLLAPSE_KEY = "studdup.sidebar.collapsed";
const AUTO_COLLAPSE_WIDTH = 1024;

const EXPANDED_WIDTH = 250;
const RAIL_WIDTH = 66;

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

/** A "toggle sidebar" glyph: a rounded panel with a divided-off left rail. */
function SidebarToggleIcon() {
  return (
    <span
      aria-hidden
      style={{
        width: 15,
        height: 13,
        borderRadius: 3.5,
        border: "1.6px solid currentColor",
        display: "flex",
        overflow: "hidden",
        flex: "none",
      }}
    >
      <span style={{ width: 5, background: "currentColor" }} />
    </span>
  );
}

/** The nav glyphs, reproduced as CSS shapes exactly as the handoff `IconeNav` component. */
function NavIcon({ route, size = 15 }: { route: RouteKey; size?: number }) {
  const s = { flex: "none" as const };
  switch (route) {
    case "inicio":
      return (
        <span
          style={{ ...s, width: 13, height: 13, borderRadius: 4, background: "currentColor", opacity: 0.85 }}
        />
      );
    case "quadro":
      return (
        <span style={{ ...s, display: "flex", gap: 2, alignItems: "stretch", height: 13 }}>
          <span style={{ width: 4, borderRadius: 2, background: "currentColor" }} />
          <span style={{ width: 4, borderRadius: 2, background: "currentColor", opacity: 0.55 }} />
          <span style={{ width: 4, borderRadius: 2, background: "currentColor", opacity: 0.3 }} />
        </span>
      );
    case "historico":
      return (
        <span style={{ ...s, width: 13, height: 13, borderRadius: 999, border: "1.6px solid currentColor" }} />
      );
    case "tecnicas":
      return (
        <span
          style={{ ...s, width: 14, height: 12, clipPath: "polygon(50% 0,100% 100%,0 100%)", background: "currentColor" }}
        />
      );
    case "ajuda":
      return (
        <span
          style={{
            ...s,
            width: 14,
            height: 14,
            borderRadius: 999,
            border: "1.6px solid currentColor",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            font: "700 9px/1 var(--font-sans)",
          }}
        >
          ?
        </span>
      );
    case "configuracoes":
      return (
        <span
          style={{
            ...s,
            width: 13,
            height: 13,
            borderRadius: 5,
            border: "1.6px solid currentColor",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ width: 4, height: 4, borderRadius: 999, background: "currentColor" }} />
        </span>
      );
    default:
      return <span style={{ ...s, width: size, height: size }} />;
  }
}

export function AppShell() {
  const [collapsedPref, setCollapsedPref] = useState<boolean>(readCollapsedPref);
  const [narrow, setNarrow] = useState<boolean>(
    () => typeof window !== "undefined" && window.innerWidth < AUTO_COLLAPSE_WIDTH,
  );
  const [route, setRoute] = useState<RouteKey>(DEFAULT_ROUTE);
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(getStoredPreference()));
  const method = useStore((s) => s.activeMethod);
  const setMethod = useStore((s) => s.setActiveMethod);

  const collapsed = narrow || collapsedPref;
  const isBoard = route === "quadro";
  const isMethodScoped = METHOD_SCOPED.has(route);

  const toggleCollapse = useCallback(() => {
    setCollapsedPref((prev) => {
      const next = !prev;
      writeCollapsedPref(next);
      return next;
    });
  }, []);

  const chooseTheme = useCallback((t: Theme) => {
    setThemePreference(t);
    setTheme(t);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setNarrow(window.innerWidth < AUTO_COLLAPSE_WIDTH);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      <Sidebar
        collapsed={collapsed}
        canToggle={!narrow}
        route={route}
        theme={theme}
        onNavigate={setRoute}
        onToggle={toggleCollapse}
        onChooseTheme={chooseTheme}
      />

      <main
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          background: "var(--bg)",
        }}
      >
        {METHOD_SCOPED.has(route) && (
          <div
            style={{
              flex: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              padding: "18px 22px 12px",
            }}
          >
            <MethodSwitcher value={method} onChange={setMethod} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 13px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 11,
                  width: 172,
                }}
              >
                <span
                  style={{ width: 11, height: 11, borderRadius: 999, border: "1.5px solid var(--text-3)", flex: "none" }}
                />
                <span style={{ font: "400 12.5px/1 var(--font-sans)", color: "var(--text-3)" }}>Buscar card…</span>
              </div>
              <div
                style={{
                  padding: "9px 13px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 11,
                  font: "500 12.5px/1 var(--font-sans)",
                  color: "var(--text-2)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Todas as técnicas ▾
              </div>
            </div>
          </div>
        )}

        <section
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            // The board owns its own padding and scrolls its columns internally; every other
            // screen gets a standard content padding and scrolls the page area itself.
            overflow: isBoard ? "hidden" : "auto",
            padding: isBoard ? 0 : isMethodScoped ? "0 22px 22px" : "22px 24px",
          }}
        >
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
  theme: Theme;
  onNavigate: (route: RouteKey) => void;
  onToggle: () => void;
  onChooseTheme: (t: Theme) => void;
}

function Sidebar({ collapsed, canToggle, route, theme, onNavigate, onToggle, onChooseTheme }: SidebarProps) {
  if (collapsed) {
    return (
      <nav
        aria-label="Navegação principal"
        style={{
          width: RAIL_WIDTH,
          flex: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          padding: "18px 0",
          background: "var(--surface-2)",
          borderRight: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            width: 29,
            height: 29,
            borderRadius: 9,
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 999, background: "var(--accent-ink)" }} />
        </div>
        {canToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Expandir a barra lateral"
            title="Expandir a barra lateral (Ctrl+B)"
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              border: "none",
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-2)",
              cursor: "pointer",
            }}
          >
            <SidebarToggleIcon />
          </button>
        )}
        <button
          type="button"
          title="Novo Card"
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: "var(--accent)",
            color: "var(--accent-ink)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            font: "600 17px/1 var(--font-sans)",
            cursor: "pointer",
            boxShadow: "var(--shadow-accent)",
          }}
        >
          ＋
        </button>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
          {ROUTES.map((item) => {
            const active = item.key === route;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                aria-current={active ? "page" : undefined}
                title={item.label}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  background: active ? "var(--accent-soft)" : "transparent",
                  color: active ? "var(--accent-soft-ink)" : "var(--text-2)",
                }}
              >
                <NavIcon route={item.key} size={16} />
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Navegação principal"
      style={{
        width: EXPANDED_WIDTH,
        flex: "none",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        padding: "18px 14px",
        background: "var(--surface-2)",
        borderRight: "1px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 2px" }}>
        <div
          style={{
            width: 27,
            height: 27,
            borderRadius: 9,
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
          }}
        >
          <span style={{ width: 9, height: 9, borderRadius: 999, background: "var(--accent-ink)" }} />
        </div>
        <span style={{ font: "600 16.5px/1 var(--font-sans)", letterSpacing: "-.02em", flex: 1 }}>Studdup</span>
        {canToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Recolher menu"
            title="Recolher a barra lateral (Ctrl+B)"
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              border: "none",
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-3)",
              cursor: "pointer",
              flex: "none",
            }}
          >
            <SidebarToggleIcon />
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
          gap: 7,
          padding: 11,
          borderRadius: 13,
          border: "none",
          background: "var(--accent)",
          color: "var(--accent-ink)",
          font: "600 13.5px/1 var(--font-sans)",
          cursor: "pointer",
          boxShadow: "var(--shadow-accent)",
        }}
      >
        <span aria-hidden>＋</span>
        Novo Card
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {ROUTES.map((item) => {
          const active = item.key === route;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              aria-current={active ? "page" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "9px 11px",
                borderRadius: 11,
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                font: active ? "600 13px/1 var(--font-sans)" : "500 13px/1 var(--font-sans)",
                background: active ? "var(--accent-soft)" : "transparent",
                color: active ? "var(--accent-soft-ink)" : "var(--text-2)",
              }}
            >
              <NavIcon route={item.key} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 9 }}>
        <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--surface-3)", borderRadius: 11 }}>
          {(["light", "dark"] as const).map((t) => {
            const active = theme === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => onChooseTheme(t)}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: 6,
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  font: active ? "600 11.5px/1 var(--font-sans)" : "500 11.5px/1 var(--font-sans)",
                  background: active ? (t === "light" ? "var(--surface)" : "var(--bg)") : "transparent",
                  color: active ? "var(--text)" : "var(--text-2)",
                }}
              >
                {t === "light" ? "Claro" : "Escuro"}
              </button>
            );
          })}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "0 2px",
            font: "400 10.5px/1.35 var(--font-sans)",
            color: "var(--text-3)",
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: 999, background: "var(--revisar)", flex: "none" }} />
          Offline · salvo neste computador
        </div>
      </div>
    </nav>
  );
}
