// Phone navigation (RWD-05): a fixed bottom tab bar of the primary ROUTES with an emphasized
// "Novo Card" floating action, replacing the left sidebar/rail so nav is thumb-reachable and stops
// eating horizontal space.
//
// Built 1:1 with the handoff (design/handoff/project/ShellCelular.dc.html): a `var(--surface)` bar
// with a top border and `env(safe-area-inset-bottom)` padding, six flex tabs (icon + tiny label,
// active in the accent ink), and the Novo Card FAB floating above the bar over a gradient fade.
// Every tab is ≥44px tall/wide and the FAB is 56px, meeting the touch-target minimum (RWD-04).

import { useState } from "react";
import { NavGlyph } from "./brand";
import { ROUTES, type RouteKey } from "../routes";

interface BottomNavProps {
  route: RouteKey;
  onNavigate: (route: RouteKey) => void;
  onNewCard: () => void;
}

/** Tiny hover helper — mirrors the `useHover` pattern used across the shell. */
function useHover() {
  const [hover, setHover] = useState(false);
  return {
    hover,
    bind: { onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false) },
  };
}

/** The emphasized "Novo Card" floating action button — accent tile, floats above the bar. */
function NovoCardFab({ onClick }: { onClick: () => void }) {
  const { hover, bind } = useHover();
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        justifyContent: "flex-end",
        padding: "0 16px",
        height: 0,
      }}
    >
      <button
        type="button"
        onClick={onClick}
        title="Novo Card"
        aria-label="Novo Card"
        {...bind}
        style={{
          pointerEvents: "auto",
          position: "relative",
          top: -72,
          width: 56,
          height: 56,
          borderRadius: 19,
          border: "none",
          background: hover ? "var(--accent-hover)" : "var(--accent)",
          color: "var(--accent-ink)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          font: "500 26px/1 var(--font-sans)",
          cursor: "pointer",
          boxShadow: "var(--shadow-accent)",
          transition: "background var(--transition-fast)",
        }}
      >
        ＋
      </button>
    </div>
  );
}

/** A single bottom-bar tab — icon over a tiny label, active in the accent ink. ≥44px target. */
function BottomNavItem({
  item,
  active,
  onNavigate,
}: {
  item: (typeof ROUTES)[number];
  active: boolean;
  onNavigate: (route: RouteKey) => void;
}) {
  const color = active ? "var(--accent-soft-ink)" : "var(--text-3)";
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.key)}
      aria-current={active ? "page" : undefined}
      title={item.label}
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        height: 54,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        color,
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <NavGlyph route={item.key} size={20} />
      </span>
      <span
        style={{
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          letterSpacing: "-.01em",
          font: `${active ? 600 : 500} 9.5px/1 var(--font-sans)`,
        }}
      >
        {item.label}
      </span>
    </button>
  );
}

/** The phone bottom tab bar (RWD-05). Fixed to the bottom; content above must reserve room for it. */
export function BottomNav({ route, onNavigate, onNewCard }: BottomNavProps) {
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        pointerEvents: "none",
      }}
    >
      {/* Gradient fade so scrolling content dissolves under the floating FAB (handoff). */}
      <div
        aria-hidden
        style={{ height: 96, background: "linear-gradient(to bottom, transparent, var(--bg) 55%)" }}
      />
      <NovoCardFab onClick={onNewCard} />
      <nav
        aria-label="Navegação principal"
        style={{
          pointerEvents: "auto",
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          paddingBottom: "env(safe-area-inset-bottom, 20px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "stretch" }}>
          {ROUTES.map((item) => (
            <BottomNavItem
              key={item.key}
              item={item}
              active={item.key === route}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}
