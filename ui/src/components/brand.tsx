// Brand + interface iconography (handoff "Studdup · Identidade", design/handoff/project/Studdup Logo.dc.html).
//
// The primary mark is "A Pilha" (1a): three offset flashcards with a check on the front card,
// suggesting the spaced-repetition stack you review. It renders in `currentColor` (the caller sets
// the accent) with a white check, so it sits correctly on both the light and dark sidebars.
//
// The wordmark is "Studd·up": the design shipped "Stud·dup" with a purple "dup", but the intended
// pun is *study up* (the English phrasal verb), so the purple segment is "up" — "Studd" in the text
// colour, "up" in the accent.
//
// The nav glyphs are real line icons (stroke, currentColor) rather than abstract CSS shapes, so each
// route reads at a glance: início (home), quadro (kanban), histórico (clock), técnicas (lightbulb),
// ajuda (help), configurações (gear).

import type { CSSProperties } from "react";
import type { RouteKey } from "../routes";

/** The primary "A Pilha" mark. Colour comes from `currentColor`; the check is always white. */
export function StuddupMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      style={{ display: "block", flex: "none" }}
    >
      <rect x="6" y="14" width="26" height="18" rx="4.5" fill="currentColor" opacity="0.28" />
      <rect x="11" y="9.5" width="26" height="18" rx="4.5" fill="currentColor" opacity="0.5" />
      <rect x="16" y="5" width="26" height="30" rx="5" fill="currentColor" />
      <path
        d="M23 20.5l4 4 8-8.5"
        stroke="white"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.92"
      />
    </svg>
  );
}

/**
 * The mark inside the rounded accent "azulejo" — the app-icon lockup. Used where the mark needs a
 * solid tile behind it (e.g. a standalone header), matching the handoff `app icon` treatment.
 */
export function StuddupAppTile({ size = 40, radius }: { size?: number; radius?: number }) {
  const r = radius ?? Math.round(size * 0.26);
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: r,
        background: "var(--accent)",
        color: "var(--accent-ink)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
        boxShadow: "0 10px 22px -12px var(--accent)",
      }}
    >
      <StuddupMark size={Math.round(size * 0.55)} />
    </span>
  );
}

/** The "Studd·up" wordmark — "up" in the accent. */
export function Wordmark({ style }: { style?: CSSProperties }) {
  return (
    <span style={{ letterSpacing: "-.02em", ...style }}>
      Studd<span style={{ color: "var(--accent)" }}>up</span>
    </span>
  );
}

// ── Nav line icons ───────────────────────────────────────────────────────────────────────────────
// All share a 24×24 viewBox, round caps/joins and a 1.7px stroke so they read as one family.

function Line({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ display: "block", flex: "none" }}
    >
      {children}
    </svg>
  );
}

const NAV_GLYPHS: Record<RouteKey, (size: number) => React.ReactElement> = {
  inicio: (size) => (
    <Line size={size}>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9.3V19a1.2 1.2 0 0 0 1.2 1.2H10v-5.2h4v5.2h3.3A1.2 1.2 0 0 0 18.5 19V9.3" />
    </Line>
  ),
  quadro: (size) => (
    <Line size={size}>
      <rect x="3.2" y="4" width="4.6" height="16" rx="1.5" />
      <rect x="9.7" y="4" width="4.6" height="11" rx="1.5" />
      <rect x="16.2" y="4" width="4.6" height="13.5" rx="1.5" />
    </Line>
  ),
  historico: (size) => (
    <Line size={size}>
      <path d="M3.5 12a8.5 8.5 0 1 1 2.6 6.1" />
      <path d="M3.5 19v-4h4" />
      <path d="M12 7.5V12l3 1.8" />
    </Line>
  ),
  tecnicas: (size) => (
    <Line size={size}>
      <path d="M9 17.5h6" />
      <path d="M10 20.5h4" />
      <path d="M8.2 14.5a6 6 0 1 1 7.6 0c-.9.7-1.3 1.5-1.4 2.5H9.6c-.1-1-.5-1.8-1.4-2.5Z" />
    </Line>
  ),
  ajuda: (size) => (
    <Line size={size}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.4a2.5 2.5 0 0 1 4.6 1.3c0 1.6-2.2 2-2.2 3.6" />
      <path d="M12 17.2h.01" />
    </Line>
  ),
  configuracoes: (size) => (
    <Line size={size}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6" />
    </Line>
  ),
};

/** A route's nav glyph as a real line icon. */
export function NavGlyph({ route, size = 18 }: { route: RouteKey; size?: number }) {
  return NAV_GLYPHS[route](size);
}

/** A plus icon for the "Novo Card" action. */
export function PlusIcon({ size = 16 }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M12 5v14M5 12h14" />
    </Line>
  );
}

/** A search (magnifier) icon for the board search field. */
export function SearchIcon({ size = 15 }: { size?: number }) {
  return (
    <Line size={size}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.6-3.6" />
    </Line>
  );
}

/** The "toggle sidebar" glyph: a rounded panel with a divided-off left rail. */
export function SidebarToggleIcon({ size = 17 }: { size?: number }) {
  return (
    <Line size={size}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M9.5 4.5v15" />
    </Line>
  );
}
