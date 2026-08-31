// Method switcher — the segmented control promoted above the board (AD-009). Two options:
// "Repetição Espaçada" and "Prova". Always fully legible (never collapsed into an icon).
// Styled 1:1 with the handoff (design/handoff/project/Quadro.dc.html, lines 91–99).

import type { Method } from "../lib/bindings";

const OPTIONS: { value: Method; label: string }[] = [
  { value: "SpacedRepetition", label: "Repetição Espaçada" },
  { value: "ExamPrep", label: "Prova" },
];

export interface MethodSwitcherProps {
  value: Method;
  onChange: (method: Method) => void;
  /** Phone (RWD-05): stretch to the full gutter width with two equal halves, so the long
   *  "Repetição Espaçada" label is never clipped by whatever shares its row. */
  fullWidth?: boolean;
}

export function MethodSwitcher({ value, onChange, fullWidth = false }: MethodSwitcherProps) {
  return (
    <div
      role="tablist"
      aria-label="Método de estudo"
      style={{
        display: fullWidth ? "flex" : "inline-flex",
        width: fullWidth ? "100%" : undefined,
        gap: 5,
        padding: 5,
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        flex: "none",
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
              display: "flex",
              alignItems: "center",
              justifyContent: fullWidth ? "center" : undefined,
              gap: fullWidth ? 7 : 9,
              flex: fullWidth ? 1 : "none",
              minWidth: 0,
              // 44px tall on phone so each half is a real touch target (RWD-04).
              minHeight: fullWidth ? 44 : undefined,
              padding: fullWidth ? "0 10px" : "9px 16px",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "var(--transition-fast)",
              font: active ? "600 13px/1 var(--font-sans)" : "500 13px/1 var(--font-sans)",
              background: active ? "var(--accent)" : "transparent",
              color: active ? "var(--accent-ink)" : "var(--text-2)",
              boxShadow: active ? "var(--shadow-1)" : "none",
            }}
          >
            <span
              aria-hidden
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                flex: "none",
                background: active ? "var(--accent-ink)" : "transparent",
                border: active ? "none" : "1.5px solid var(--text-3)",
              }}
            />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
