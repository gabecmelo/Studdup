// Empty state (handoff "Estado vazio"). Non-punitive placeholder used by empty columns, an
// empty method board (METH-06) and empty history (HIST-06) — always names the situation and, when
// relevant, offers the next step rather than reading as an error.

import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 12,
        padding: "40px 24px",
        background: "var(--surface-2)",
        border: "1px dashed var(--border-strong)",
        borderRadius: "var(--radius-xl)",
        color: "var(--text-2)",
      }}
    >
      {icon && <div aria-hidden style={{ fontSize: 28, opacity: 0.8 }}>{icon}</div>}
      <div style={{ font: "600 16px/1.3 var(--font-sans)", color: "var(--text)" }}>
        {title}
      </div>
      {description && (
        <div style={{ font: "400 13.5px/1.5 var(--font-sans)", maxWidth: 340 }}>
          {description}
        </div>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          style={{
            marginTop: 4,
            font: "600 13px/1 var(--font-sans)",
            padding: "10px 16px",
            borderRadius: "var(--radius-pill)",
            border: "none",
            cursor: "pointer",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            boxShadow: "var(--shadow-1)",
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
