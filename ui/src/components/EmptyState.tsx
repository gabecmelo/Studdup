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
}

export function EmptyState({ title, description, actionLabel, onAction, icon }: EmptyStateProps) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 130,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 9,
        padding: "18px 12px",
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
      <div style={{ font: "500 11.5px/1.45 var(--font-sans)", color: "var(--text-2)", maxWidth: 170 }}>
        {title}
      </div>
      {description && (
        <div style={{ font: "400 11px/1.45 var(--font-sans)", color: "var(--text-3)", maxWidth: 200 }}>
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
