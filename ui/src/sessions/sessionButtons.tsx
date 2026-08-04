// Shared hover-aware buttons for the full-screen study sessions (None / Pomodoro): a primary accent
// action that deepens to accent-hover, and a quiet "Sair" that fills to surface-2 on hover.

import { useState } from "react";
import type { ReactNode } from "react";

export function SessionPrimaryButton({ onClick, children }: { onClick?: () => void; children: ReactNode }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "15px 40px",
        borderRadius: 15,
        border: "none",
        cursor: "pointer",
        background: hover ? "var(--accent-hover)" : "var(--accent)",
        color: "var(--accent-ink)",
        font: "600 15px/1 var(--font-sans)",
        boxShadow: "var(--shadow-accent)",
        transition: "background var(--transition-fast)",
      }}
    >
      {children}
    </button>
  );
}

export function SessionExitButton({ onClick, children = "Sair" }: { onClick?: () => void; children?: ReactNode }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "8px 13px",
        borderRadius: 11,
        border: "none",
        background: hover ? "var(--surface-2)" : "transparent",
        color: hover ? "var(--text)" : "var(--text-3)",
        font: "500 12px/1 var(--font-sans)",
        cursor: "pointer",
        transition: "background var(--transition-fast), color var(--transition-fast)",
      }}
    >
      {children}
    </button>
  );
}
