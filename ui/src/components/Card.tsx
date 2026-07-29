// Board card (handoff "Card do quadro"). The soft, rounded, elevated card that carries the drag
// language (AD-008). Presentational only — it takes a stage badge slot, an optional technique +
// duration line (active cards show the *estimate*, completed cards the *actual* focused time —
// same slot, two meanings, AD-010), an optional overdue marker, and a primary action.

import type { ReactNode } from "react";
import type { Technique } from "../lib/bindings";
import { sessionDurationLabel } from "../lib/sessionEstimate";
import { TECHNIQUE_LABEL } from "./TechniqueChip";

export interface CardProps {
  title: string;
  /** Stage badge slot (a `StageBadge` in practice). */
  badge?: ReactNode;
  technique?: Technique | null;
  /** Active card: estimated session length in minutes. */
  estMinutes?: number | null;
  /** Completed card: actual focused seconds recorded on the session (overrides the estimate). */
  focusedSecs?: number | null;
  /** Whole days overdue; when > 0 an overdue badge is shown. */
  overdueDays?: number;
  actionLabel?: string;
  onAction?: () => void;
  onClick?: () => void;
}

export function Card({
  title,
  badge,
  technique,
  estMinutes,
  focusedSecs,
  overdueDays = 0,
  actionLabel,
  onAction,
  onClick,
}: CardProps) {
  const duration = sessionDurationLabel(estMinutes, focusedSecs);
  const meta: string[] = [];
  if (technique) meta.push(TECHNIQUE_LABEL[technique]);
  if (duration) meta.push(duration);

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 16,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-1)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {badge}
        {overdueDays > 0 && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              font: "600 11px/1 var(--font-sans)",
              padding: "5px 9px",
              borderRadius: "var(--radius-pill)",
              background: "var(--atraso-soft)",
              color: "var(--atraso-ink)",
            }}
          >
            {overdueDays} {overdueDays === 1 ? "dia" : "dias"} de atraso
          </span>
        )}
      </div>

      <div
        style={{
          font: "600 16px/1.35 var(--font-sans)",
          letterSpacing: "-.01em",
          color: "var(--text)",
        }}
      >
        {title}
      </div>

      {(meta.length > 0 || actionLabel) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          {meta.length > 0 && (
            <span style={{ font: "500 12.5px/1 var(--font-sans)", color: "var(--text-2)" }}>
              {meta.join(" · ")}
            </span>
          )}
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAction();
              }}
              style={{
                marginLeft: "auto",
                font: "600 12.5px/1 var(--font-sans)",
                padding: "8px 14px",
                borderRadius: "var(--radius-pill)",
                border: "none",
                cursor: "pointer",
                background: "var(--accent)",
                color: "var(--accent-ink)",
              }}
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
