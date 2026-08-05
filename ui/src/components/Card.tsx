// Board card (handoff "Card do quadro", design/handoff/project/Quadro.dc.html lines 143–167).
// The soft, rounded, elevated tile that carries the drag language (AD-008). Presentational only:
// a top row with the "A Estudar" / "A Revisar" pill and the stage badge, the title, an optional
// overdue row, and a bottom row with the technique (icon + name) and the duration — active cards
// show the *estimate*, completed cards the *actual* focused time (same slot, AD-010).

import { type ReactNode, useState } from "react";
import type { Technique } from "../lib/bindings";
import { sessionDurationLabel } from "../lib/sessionEstimate";
import { TECHNIQUE_LABEL, TechniqueIcon } from "./TechniqueChip";

export interface CardProps {
  title: string;
  /** "A Estudar" (fresh study) vs "A Revisar" (a review) — the handoff card's leading pill. */
  kind?: "estudar" | "revisar";
  /** Stage badge slot (a `StageBadge` in practice), shown on the right of the top row. */
  badge?: ReactNode;
  technique?: Technique | null;
  /** Active card: estimated session length in minutes. */
  estMinutes?: number | null;
  /** Completed card: actual focused seconds recorded on the session (overrides the estimate). */
  focusedSecs?: number | null;
  /** Whole days overdue; when > 0 an overdue row is shown. */
  overdueDays?: number;
  /** Optional pre-formatted overdue text (else a default "N dias de atraso"). */
  overdueText?: string;
  onClick?: () => void;
}

export function Card({
  title,
  kind = "estudar",
  badge,
  technique,
  estMinutes,
  focusedSecs,
  overdueDays = 0,
  overdueText,
  onClick,
}: CardProps) {
  const [hover, setHover] = useState(false);
  const duration = sessionDurationLabel(estMinutes, focusedSecs);
  const isEstudar = kind === "estudar";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 9,
        padding: 13,
        background: "var(--surface)",
        border: `1px solid ${hover ? "var(--accent)" : "var(--border)"}`,
        borderRadius: 15,
        boxShadow: hover ? "var(--shadow-2)" : "var(--shadow-1)",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 8px 3px 6px",
            borderRadius: 999,
            background: isEstudar ? "var(--accent-soft)" : "var(--revisar-soft)",
            color: isEstudar ? "var(--accent-soft-ink)" : "var(--revisar-ink)",
            font: "600 10px/1.4 var(--font-sans)",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ width: 4, height: 4, borderRadius: 999, background: "currentColor" }} />
          {isEstudar ? "A Estudar" : "A Revisar"}
        </span>
        {badge}
      </div>

      <div style={{ font: "600 13.5px/1.35 var(--font-sans)", letterSpacing: "-.01em", color: "var(--text)" }}>
        {title}
      </div>

      {overdueDays > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 9px",
            borderRadius: 9,
            background: "var(--atraso-soft)",
            color: "var(--atraso-ink)",
            font: "500 11px/1.3 var(--font-sans)",
          }}
        >
          <span style={{ width: 4, height: 4, borderRadius: 999, background: "currentColor", flex: "none" }} />
          {overdueText ?? `${overdueDays} ${overdueDays === 1 ? "dia" : "dias"} de atraso`}
        </div>
      )}

      {(technique || duration) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
          {technique && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                minWidth: 0,
                font: "500 11px/1 var(--font-sans)",
                color: "var(--text-2)",
              }}
            >
              <TechniqueIcon technique={technique} size={13} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {TECHNIQUE_LABEL[technique]}
              </span>
            </span>
          )}
          {duration && (
            <span style={{ font: "400 10.5px/1 var(--font-mono)", color: "var(--text-3)", whiteSpace: "nowrap" }}>
              {duration}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
