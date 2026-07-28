// Method switcher — the segmented control promoted above the board (AD-009). Two options:
// "Repetição Espaçada" and "Prova". Always fully legible (never collapsed into an icon).

import type { Method } from "../lib/bindings";

const OPTIONS: { value: Method; label: string }[] = [
  { value: "SpacedRepetition", label: "Repetição Espaçada" },
  { value: "ExamPrep", label: "Prova" },
];

export interface MethodSwitcherProps {
  value: Method;
  onChange: (method: Method) => void;
}

export function MethodSwitcher({ value, onChange }: MethodSwitcherProps) {
  return (
    <div
      role="tablist"
      aria-label="Método de estudo"
      style={{
        display: "inline-flex",
        gap: 4,
        padding: 4,
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-pill)",
      }}
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            style={{
              font: "600 13.5px/1.2 var(--font-sans)",
              padding: "9px 18px",
              borderRadius: "var(--radius-pill)",
              border: "none",
              cursor: "pointer",
              transition: "var(--transition-fast)",
              background: active ? "var(--accent)" : "transparent",
              color: active ? "var(--accent-ink)" : "var(--text-2)",
              boxShadow: active ? "var(--shadow-1)" : "none",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
