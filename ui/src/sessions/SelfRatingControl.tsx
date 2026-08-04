// Self-rating control (TECH-06, handoff "modoAvaliacao" in SessaoActiveRecall/SessaoFeynman). The
// three-point retrieval scale shown when a written session finishes: three tappable rows that report
// the chosen 0/1/2 value. The prompt/subtitle and the per-rung copy are caller-provided so Active
// Recall and Feynman can phrase them their own way; the value mapping is the shared `SELF_RATING`.

import { useState } from "react";
import { SELF_RATING, type SelfRatingOption, type SelfRatingValue, selfRatingDot } from "./selfRating";

export interface SelfRatingProps {
  title: string;
  subtitle: string;
  /** Override the rung copy (labels/notes) while keeping the 0/1/2 mapping; defaults to SELF_RATING. */
  options?: readonly SelfRatingOption[];
  onSelect: (value: SelfRatingValue) => void;
}

export function SelfRating({ title, subtitle, options = SELF_RATING, onSelect }: SelfRatingProps) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        maxWidth: 640,
        width: "100%",
        margin: "0 auto",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", textAlign: "center" }}>
        <span style={{ font: "600 24px/1.25 var(--font-sans)", letterSpacing: "-.02em", color: "var(--text)" }}>
          {title}
        </span>
        <span style={{ font: "400 13.5px/1.5 var(--font-sans)", color: "var(--text-2)", maxWidth: 460 }}>
          {subtitle}
        </span>
      </div>
      <div role="radiogroup" aria-label="Autoavaliação" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 11 }}>
        {options.map((o) => (
          <RatingRow key={o.value} option={o} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function RatingRow({ option, onSelect }: { option: SelfRatingOption; onSelect: (value: SelfRatingValue) => void }) {
  const [hover, setHover] = useState(false);
  const dot = selfRatingDot(option.tone);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={false}
      onClick={() => onSelect(option.value)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "17px 20px",
        borderRadius: 15,
        background: "var(--surface)",
        border: `1.5px solid ${hover ? dot : "var(--border-strong)"}`,
        cursor: "pointer",
        textAlign: "left",
        transition: "border-color var(--transition-fast)",
      }}
    >
      <span aria-hidden style={{ width: 12, height: 12, borderRadius: 999, background: dot, flex: "none" }} />
      <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ font: "600 15px/1.2 var(--font-sans)", color: "var(--text)" }}>{option.label}</span>
        <span style={{ font: "400 12px/1.3 var(--font-sans)", color: "var(--text-2)" }}>{option.note}</span>
      </span>
    </button>
  );
}
