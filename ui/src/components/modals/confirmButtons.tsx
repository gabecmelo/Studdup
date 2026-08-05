// Shared footer buttons for the destructive confirmation modals (ExcluirCard / ExcluirProva). These
// modals use a richer custom shell than ModalShell, so they share these hover-aware buttons rather
// than the plain ModalButton: a ghost "Cancelar" that fills on hover and a danger action that
// darkens on hover.

import { useState } from "react";
import type { ReactNode } from "react";

export function GhostBtn({ onClick, children }: { onClick?: () => void; children: ReactNode }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "10px 18px",
        borderRadius: 11,
        border: "none",
        background: hover ? "var(--surface-3)" : "transparent",
        color: hover ? "var(--text)" : "var(--text-2)",
        font: "600 13px/1 var(--font-sans)",
        cursor: "pointer",
        transition: "background var(--transition-fast), color var(--transition-fast)",
      }}
    >
      {children}
    </button>
  );
}

export function DangerBtn({ onClick, children }: { onClick?: () => void; children: ReactNode }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "10px 20px",
        borderRadius: 11,
        border: "none",
        background: "var(--danger)",
        color: "var(--accent-ink)",
        font: "600 13px/1 var(--font-sans)",
        cursor: "pointer",
        boxShadow: "0 6px 18px -8px var(--danger)",
        filter: hover ? "brightness(0.94)" : "none",
        transition: "filter var(--transition-fast)",
      }}
    >
      {children}
    </button>
  );
}
