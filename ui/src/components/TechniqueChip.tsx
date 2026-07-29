// Technique chip (handoff "Chips de técnica"). A small selectable pill naming a technique, with a
// one-line summary available for the picker (TECH catalog / P2 catalog reuses these labels).

import type { ReactNode } from "react";
import type { Technique } from "../lib/bindings";

export const TECHNIQUE_LABEL: Record<Technique, string> = {
  Pomodoro: "Pomodoro",
  ActiveRecall: "Active Recall",
  Feynman: "Feynman",
  Leitner: "Leitner",
};

/** One-line summaries surfaced inline in the technique picker (TECH-07 inline hint). */
export const TECHNIQUE_SUMMARY: Record<Technique, string> = {
  Pomodoro: "Blocos de foco e pausa cronometrados.",
  ActiveRecall: "Escreva de memória antes de conferir a fonte.",
  Feynman: "Explique como se ensinasse a um iniciante.",
  Leitner: "Flashcards que voltam conforme você erra.",
};

/**
 * The technique glyphs, reproduced as CSS shapes exactly as the handoff `IconeTecnica` component
 * (design/handoff/project/IconeTecnica.dc.html). `currentColor`-driven so they take the caller's
 * text color. Shapes are authored at 13px; `size` scales the box around them.
 */
export function TechniqueIcon({ technique, size = 13 }: { technique: Technique; size?: number }) {
  const box = {
    width: size,
    height: size,
    flex: "none" as const,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "currentColor",
  };
  let shape: ReactNode;
  switch (technique) {
    case "Pomodoro":
      shape = (
        <span
          style={{
            width: 13,
            height: 13,
            borderRadius: 999,
            border: "1.4px solid currentColor",
            background: "conic-gradient(currentColor 0 25%,transparent 0)",
          }}
        />
      );
      break;
    case "ActiveRecall":
      shape = (
        <span
          style={{
            width: 13,
            height: 13,
            borderRadius: 999,
            border: "1.4px solid currentColor",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ width: 4, height: 4, borderRadius: 999, background: "currentColor" }} />
        </span>
      );
      break;
    case "Feynman":
      shape = (
        <span
          style={{ width: 13, height: 11, clipPath: "polygon(50% 0,100% 100%,0 100%)", background: "currentColor" }}
        />
      );
      break;
    case "Leitner":
      shape = (
        <span style={{ display: "flex", flexDirection: "column", gap: 2, width: 13 }}>
          <span style={{ height: 2.5, borderRadius: 2, background: "currentColor" }} />
          <span style={{ height: 2.5, borderRadius: 2, background: "currentColor", opacity: 0.6 }} />
          <span style={{ height: 2.5, borderRadius: 2, background: "currentColor", opacity: 0.3 }} />
        </span>
      );
      break;
  }
  return (
    <span aria-hidden style={box}>
      {shape}
    </span>
  );
}

export interface TechniqueChipProps {
  technique: Technique;
  selected?: boolean;
  onClick?: (technique: Technique) => void;
  title?: string;
}

export function TechniqueChip({
  technique,
  selected = false,
  onClick,
  title,
}: TechniqueChipProps) {
  const interactive = typeof onClick === "function";
  return (
    <button
      type="button"
      aria-pressed={interactive ? selected : undefined}
      title={title ?? TECHNIQUE_SUMMARY[technique]}
      onClick={interactive ? () => onClick!(technique) : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        font: "600 12.5px/1 var(--font-sans)",
        padding: "7px 12px",
        borderRadius: "var(--radius-pill)",
        cursor: interactive ? "pointer" : "default",
        transition: "var(--transition-fast)",
        background: selected ? "var(--accent-soft)" : "var(--surface-2)",
        color: selected ? "var(--accent-soft-ink)" : "var(--text-2)",
        border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 7,
          height: 7,
          borderRadius: "var(--radius-pill)",
          background: selected ? "var(--accent)" : "var(--text-3)",
        }}
      />
      {TECHNIQUE_LABEL[technique]}
    </button>
  );
}
