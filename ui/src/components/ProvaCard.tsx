// Prova board card (handoff QuadroProva, the `c.normal` / `c.concluido` variants). Distinct from the
// spaced Card: an exam-prep card carries a coloured left border in its exam's hue and drops the
// "A Estudar / A Revisar" pill. Two states:
//   - normal: left border in the exam colour, an optional urgent chip, the title, then technique + duration;
//   - concluído: a flat surface-2 tile with a "✓ Concluído" pill and the completion date, muted title.
//
// Data note: the handoff also shows a "Sessão N de M" cursor on the top-left. That per-card session
// index lives in `ExamSession` (not returned by `list_board`), so it is omitted here until that read
// is surfaced — tracked as a data gap, not a style divergence.

import { useState } from "react";
import type { Technique } from "../lib/bindings";
import { sessionDurationLabel } from "../lib/sessionEstimate";
import { TECHNIQUE_LABEL, TechniqueIcon } from "./TechniqueChip";
import { ExamStageBadge } from "./StageBadge";

export interface ProvaCardProps {
  title: string;
  /** The exam's colour (from `examColor`) — the left border + progress hue. */
  color: string;
  technique?: Technique | null;
  estMinutes?: number | null;
  /** Completed card: actual focused seconds (overrides the estimate in the duration slot). */
  focusedSecs?: number | null;
  /** Whole days overdue; when > 0 an urgent chip is shown on an active card. */
  overdueDays?: number;
  /** The card's session cursor — renders a "Sessão N de M" badge when both are present. */
  seq?: number | null;
  total?: number | null;
  /** Completed (archived) card → the muted "✓ Concluído" variant. */
  completed?: boolean;
  /** Short completion label for the completed variant (e.g. "ontem", "27 jul"). */
  completedLabel?: string;
  onClick?: () => void;
}

export function ProvaCard({
  title,
  color,
  technique,
  estMinutes,
  focusedSecs,
  overdueDays = 0,
  seq,
  total,
  completed = false,
  completedLabel,
  onClick,
}: ProvaCardProps) {
  const [hover, setHover] = useState(false);
  const duration = sessionDurationLabel(estMinutes, focusedSecs);

  if (completed) {
    return (
      <div
        onClick={onClick}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "12px 13px",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 13,
          cursor: onClick ? "pointer" : "default",
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
              background: "var(--revisar-soft)",
              color: "var(--revisar-ink)",
              font: "600 10px/1.4 var(--font-sans)",
              whiteSpace: "nowrap",
            }}
          >
            ✓ Concluído
          </span>
          {completedLabel && (
            <span style={{ font: "400 10px/1.4 var(--font-mono)", color: "var(--text-3)", whiteSpace: "nowrap" }}>
              {completedLabel}
            </span>
          )}
        </div>
        <div style={{ font: "500 13px/1.35 var(--font-sans)", color: "var(--text-2)" }}>{title}</div>
        {duration && (
          <div style={{ font: "400 10.5px/1 var(--font-mono)", color: "var(--text-3)" }}>{duration}</div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 9,
        padding: "12px 13px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${color}`,
        borderRadius: 13,
        boxShadow: hover ? "var(--shadow-2)" : "var(--shadow-1)",
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow var(--transition-fast)",
      }}
    >
      {((seq != null && total != null) || overdueDays > 0) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
          {seq != null && total != null ? <ExamStageBadge seq={seq} total={total} /> : <span />}
          {overdueDays > 0 && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                borderRadius: 999,
                background: "var(--atraso-soft)",
                color: "var(--atraso-ink)",
                font: "600 9.5px/1.3 var(--font-sans)",
                whiteSpace: "nowrap",
                flex: "none",
              }}
            >
              <span style={{ width: 4, height: 4, borderRadius: 999, background: "currentColor" }} />
              {overdueDays} {overdueDays === 1 ? "dia" : "dias"} de atraso
            </span>
          )}
        </div>
      )}

      <div style={{ font: "600 13.5px/1.35 var(--font-sans)", letterSpacing: "-.01em", color: "var(--text)" }}>
        {title}
      </div>

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
