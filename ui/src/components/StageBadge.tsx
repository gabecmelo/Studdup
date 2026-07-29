// Stage badge — two vocabularies (handoff "Badge de estágio — dois vocabulários"):
//   - Spaced repetition: a rounded pill "Dia N" (the ladder position, AD-003).
//   - Exam prep: a square-cornered filled rectangle "Sessão N de M" (the session cursor).

import type { CSSProperties } from "react";
import type { Stage } from "../lib/bindings";

const STAGE_LABEL: Record<Stage, string> = {
  Day0: "Dia 0",
  Day1: "Dia 1",
  Day2: "Dia 2",
  Day5: "Dia 5",
  Day15: "Dia 15",
  Day30: "Dia 30",
  Done: "Concluído",
};

// Both vocabularies render in DM Mono at 10px, matching the handoff card badges
// (design/handoff/project/Quadro.dc.html, `eDia` and `eSessao`).
const baseBadge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  font: "500 10px/1.4 var(--font-mono)",
  color: "var(--text-2)",
  whiteSpace: "nowrap",
};

/** Spaced repetition: an outline pill "Dia N" (rounded, border-strong contour). */
export function SpacedStageBadge({ stage }: { stage: Stage }) {
  return (
    <span
      style={{
        ...baseBadge,
        padding: "3px 9px",
        borderRadius: 999,
        border: "1px solid var(--border-strong)",
      }}
    >
      {STAGE_LABEL[stage]}
    </span>
  );
}

/** Exam prep: a square-cornered filled rectangle "Sessão N de M". */
export function ExamStageBadge({ seq, total }: { seq: number; total: number }) {
  return (
    <span
      style={{
        ...baseBadge,
        padding: "3px 8px",
        borderRadius: 7,
        background: "var(--surface-3)",
        border: "1px solid var(--border)",
      }}
    >
      Sessão {seq} de {total}
    </span>
  );
}

export type StageBadgeProps =
  | { method: "SpacedRepetition"; stage: Stage }
  | { method: "ExamPrep"; seq: number; total: number };

/** Unified entry point — dispatches to the correct vocabulary for the card's method. */
export function StageBadge(props: StageBadgeProps) {
  if (props.method === "SpacedRepetition") {
    return <SpacedStageBadge stage={props.stage} />;
  }
  return <ExamStageBadge seq={props.seq} total={props.total} />;
}
