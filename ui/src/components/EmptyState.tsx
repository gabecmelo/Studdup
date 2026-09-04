// Empty state (handoff column empty, design/handoff/project/Quadro.dc.html "vaziaCentro"). A calm,
// non-punitive placeholder: a dashed box with a dashed-ring mark and a soft one-line message. Used
// by empty columns, an empty board and empty history — names the situation, never reads as an error.

import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Override the default dashed-ring mark. */
  icon?: ReactNode;
  /** Phone/stacked (RWD-02): a slim strip instead of a 130px box, so four empty columns stacked on
   *  a phone don't turn the board into four screens of dashed emptiness. */
  compact?: boolean;
}

export function EmptyState({ title, description, actionLabel, onAction, icon, compact = false }: EmptyStateProps) {
  return (
    <div
      style={{
        // `1 0 auto` — grow into a tall column, but NEVER shrink below the text's own height. Plain
        // `flex: 1` let a squeezed parent compress the box and clip the message's second line
        // ("Amanhã está livre por…" on phone).
        flex: "1 0 auto",
        minHeight: compact ? 0 : 130,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: compact ? 7 : 9,
        padding: compact ? "16px 14px" : "18px 12px",
        border: "1.5px dashed var(--border-strong)",
        borderRadius: 15,
      }}
    >
      {icon ?? (
        <span
          aria-hidden
          style={{ width: 24, height: 24, borderRadius: 999, border: "2px dashed var(--text-3)", opacity: 0.7 }}
        />
      )}
      <div
        style={{
          font: "500 11.5px/1.45 var(--font-sans)",
          color: "var(--text-2)",
          // The cap keeps the line short in a narrow column, but it must never be wider than the
          // box itself — that is what clipped the text on a 360px phone.
          maxWidth: "min(220px, 100%)",
        }}
      >
        {title}
      </div>
      {description && (
        <div style={{ font: "400 11px/1.45 var(--font-sans)", color: "var(--text-3)", maxWidth: "min(260px, 100%)" }}>
          {description}
        </div>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          style={{
            marginTop: 4,
            font: "600 12.5px/1 var(--font-sans)",
            padding: "9px 15px",
            borderRadius: 11,
            border: "none",
            cursor: "pointer",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            boxShadow: "var(--shadow-accent)",
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
