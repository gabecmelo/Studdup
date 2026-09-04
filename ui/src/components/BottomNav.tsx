// Phone navigation (RWD-05): the bottom tab bar that replaces the sidebar so nav is thumb-reachable.
//
// Mobile-first, not a shrunken desktop rail:
//   - Five slots, not six tabs — Início · Quadro · [Novo] · Histórico · Mais. Six labels at 360px
//     forced 9.5px type that truncated ("Config…"); the three reference screens now live in the
//     "Mais" sheet (see phoneNav.ts).
//   - "Novo Card" is a slot IN the bar, not a floating FAB. The FAB sat above the bar over a 96px
//     gradient and permanently covered the last lines of every scrolling screen.
//   - The bar is a flow child of the shell column (not `position: fixed`), so its height is real
//     layout the content can never disappear under, and `env(safe-area-inset-bottom)` keeps it
//     clear of the Android gesture pill.
// Every tab is ≥56px tall and ≥64px wide, meeting the touch-target minimum (RWD-04).

import { useEffect, useState } from "react";
import { CloseIcon, MoreIcon, NavGlyph, PlusIcon } from "./brand";
import type { RouteKey } from "../routes";
import { PHONE_MORE, PHONE_TABS, isMoreRoute } from "./phoneNav";
import type { Theme } from "../styles/theme";

interface BottomNavProps {
  route: RouteKey;
  onNavigate: (route: RouteKey) => void;
  onNewCard: () => void;
  /** The theme + setter, so the sheet keeps the Claro/Escuro control reachable on phone (RWD-08). */
  theme: Theme;
  onChooseTheme: (t: Theme) => void;
}

/** Tab height, excluding the safe-area padding below it (RWD-04 touch target). */
const TAB_HEIGHT = 58;

/** A single bottom-bar tab — icon over a label, active in the accent ink. */
function Tab({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      title={label}
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        height: TAB_HEIGHT,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        color: active ? "var(--accent-soft-ink)" : "var(--text-3)",
        transition: "color var(--transition-fast)",
      }}
    >
      {children}
      <span
        style={{
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          letterSpacing: "-.005em",
          font: `${active ? 600 : 500} 11px/1 var(--font-sans)`,
        }}
      >
        {label}
      </span>
    </button>
  );
}

/** The "Novo Card" action, occupying the bar's centre slot as an accent tile. */
function NovoCardTab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Novo Card"
      aria-label="Novo Card"
      style={{
        flex: "none",
        width: 72,
        height: TAB_HEIGHT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        background: "transparent",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          width: 48,
          height: 40,
          borderRadius: 14,
          background: "var(--accent)",
          color: "var(--accent-ink)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--shadow-accent)",
        }}
      >
        <PlusIcon size={20} />
      </span>
    </button>
  );
}

/** A row in the "Mais" sheet — full-width, 52px tall, icon + label. */
function SheetRow({
  label,
  route,
  active,
  onClick,
}: {
  label: string;
  route: RouteKey;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        width: "100%",
        padding: "15px 16px",
        borderRadius: 14,
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        background: active ? "var(--accent-soft)" : "var(--surface-2)",
        color: active ? "var(--accent-soft-ink)" : "var(--text)",
        font: `${active ? 600 : 500} 15px/1 var(--font-sans)`,
      }}
    >
      <NavGlyph route={route} size={20} />
      {label}
    </button>
  );
}

/** The "Mais" bottom sheet: the reference routes plus the theme control and the offline note. */
function MoreSheet({
  route,
  theme,
  onNavigate,
  onChooseTheme,
  onClose,
}: {
  route: RouteKey;
  theme: Theme;
  onNavigate: (route: RouteKey) => void;
  onChooseTheme: (t: Theme) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mais"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <div
        aria-hidden
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "oklch(0 0 0 / 0.45)" }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: "10px 16px calc(20px + max(10px, env(safe-area-inset-bottom, 0px)))",
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          borderRadius: "22px 22px 0 0",
          boxShadow: "var(--shadow-janela)",
        }}
      >
        {/* Grab handle — the affordance that says "this sheet dismisses downward". */}
        <div style={{ display: "flex", justifyContent: "center", padding: "4px 0 6px" }}>
          <span
            aria-hidden
            style={{ width: 38, height: 4, borderRadius: 999, background: "var(--border-strong)" }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ flex: 1, font: "600 17px/1.2 var(--font-sans)", color: "var(--text)" }}>
            Mais
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: "none",
              background: "var(--surface-2)",
              color: "var(--text-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PHONE_MORE.map((item) => (
            <SheetRow
              key={item.key}
              label={item.label}
              route={item.key}
              active={item.key === route}
              onClick={() => {
                onNavigate(item.key);
                onClose();
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 4 }}>
          <span
            style={{
              flex: "none",
              font: "600 11px/1 var(--font-sans)",
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: "var(--text-3)",
            }}
          >
            Tema
          </span>
          <div
            role="group"
            aria-label="Tema"
            style={{
              flex: 1,
              display: "flex",
              gap: 4,
              padding: 4,
              background: "var(--surface-3)",
              borderRadius: 13,
            }}
          >
            {(["light", "dark"] as const).map((t) => {
              const active = theme === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onChooseTheme(t)}
                  aria-pressed={active}
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: 10,
                    border: "none",
                    cursor: "pointer",
                    font: `${active ? 600 : 500} 13.5px/1 var(--font-sans)`,
                    background: active
                      ? t === "light"
                        ? "var(--surface)"
                        : "var(--bg)"
                      : "transparent",
                    color: active ? "var(--text)" : "var(--text-2)",
                  }}
                >
                  {t === "light" ? "Claro" : "Escuro"}
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            font: "400 11.5px/1.35 var(--font-sans)",
            color: "var(--text-3)",
          }}
        >
          <span
            style={{ width: 5, height: 5, borderRadius: 999, background: "var(--revisar)", flex: "none" }}
          />
          Offline · salvo neste aparelho
        </div>
      </div>
    </div>
  );
}

/** The phone bottom tab bar (RWD-05). A flow child of the shell column — it reserves its own room. */
export function BottomNav({ route, onNavigate, onNewCard, theme, onChooseTheme }: BottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = isMoreRoute(route);

  return (
    <>
      <nav
        aria-label="Navegação principal"
        style={{
          flex: "none",
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          // `max()`, not a bare `env()` — see PhoneTopBar. Keeps the tabs off the gesture pill even
          // where the inset reports 0.
          paddingBottom: "max(10px, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div style={{ display: "flex", alignItems: "stretch" }}>
          {PHONE_TABS.slice(0, 2).map((item) => (
            <Tab
              key={item.key}
              label={item.label}
              active={item.key === route}
              onClick={() => onNavigate(item.key)}
            >
              <NavGlyph route={item.key} size={21} />
            </Tab>
          ))}

          <NovoCardTab onClick={onNewCard} />

          {PHONE_TABS.slice(2).map((item) => (
            <Tab
              key={item.key}
              label={item.label}
              active={item.key === route}
              onClick={() => onNavigate(item.key)}
            >
              <NavGlyph route={item.key} size={21} />
            </Tab>
          ))}

          <Tab label="Mais" active={moreActive} onClick={() => setMoreOpen(true)}>
            <MoreIcon size={21} />
          </Tab>
        </div>
      </nav>

      {moreOpen && (
        <MoreSheet
          route={route}
          theme={theme}
          onNavigate={onNavigate}
          onChooseTheme={onChooseTheme}
          onClose={() => setMoreOpen(false)}
        />
      )}
    </>
  );
}
