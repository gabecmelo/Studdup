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

const baseBadge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  font: "600 11.5px/1 var(--font-sans)",
  padding: "5px 10px",
  whiteSpace: "nowrap",
};

export function SpacedStageBadge({ stage }: { stage: Stage }) {
  return (
    <span
      style={{
        ...baseBadge,
        borderRadius: "var(--radius-pill)",
        background: "var(--accent-soft)",
        color: "var(--accent-soft-ink)",
      }}
    >
      {STAGE_LABEL[stage]}
    </span>
  );
}

export function ExamStageBadge({ seq, total }: { seq: number; total: number }) {
  return (
    <span
      style={{
        ...baseBadge,
        borderRadius: 4,
        background: "var(--revisar)",
        color: "var(--accent-ink)",
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
