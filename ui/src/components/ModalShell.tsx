// Modal shell (handoff "Shell de modal", design/handoff/project/Componentes.dc.html lines 273–295).
// The reusable overlay + panel chrome: a header (with an optional destructive "!" mark), a padded
// body, and a distinct footer bar (surface-2, or danger-soft when destructive). Feature modals
// compose this + the `ModalButton` helpers.

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useEscapeToClose } from "../lib/useEscapeToClose";

export interface ModalShellProps {
  title: string;
  /** Short lead paragraph under the title (the handoff modal "body" text). */
  subtitle?: ReactNode;
  children?: ReactNode;
  /** Footer action row — compose with `ModalButton`. */
  footer?: ReactNode;
  onClose?: () => void;
  open?: boolean;
  /** Destructive framing: danger border, danger-soft footer, a "!" mark by the title. */
  destructive?: boolean;
  /** Panel width (the handoff modals are 480; the detail hub is wider). */
  width?: number;
}

export function ModalShell({
  title,
  subtitle,
  children,
  footer,
  onClose,
  open = true,
  destructive = false,
  width = 480,
}: ModalShellProps) {
  useEscapeToClose(open ? onClose : undefined);
  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "oklch(0 0 0 / 0.42)",
        zIndex: 100,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          flexDirection: "column",
          width: `min(${width}px, 100%)`,
          maxHeight: "calc(100vh - 48px)",
          background: "var(--surface)",
          border: `1px solid ${destructive ? "var(--danger)" : "var(--border)"}`,
          borderRadius: 18,
          boxShadow: "var(--shadow-2)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 20px 0" }}>
          {destructive && (
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: 8,
                background: "var(--danger-soft)",
                color: "var(--danger-ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                font: "700 13px/1 var(--font-sans)",
                flex: "none",
              }}
            >
              !
            </span>
          )}
          <span style={{ font: "600 16px/1.3 var(--font-sans)", color: "var(--text)" }}>{title}</span>
        </div>

        <div
          style={{
            padding: "10px 20px 18px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {subtitle && (
            <div style={{ font: "400 13px/1.5 var(--font-sans)", color: "var(--text-2)" }}>{subtitle}</div>
          )}
          {children}
        </div>

        {footer && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              padding: "14px 20px",
              background: destructive ? "var(--danger-soft)" : "var(--surface-2)",
              borderTop: "1px solid var(--border)",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export type ModalButtonKind = "primary" | "secondary" | "danger";

const BUTTON_STYLE: Record<ModalButtonKind, CSSProperties> = {
  primary: {
    padding: "9px 16px",
    background: "var(--accent)",
    color: "var(--accent-ink)",
    font: "600 13px/1 var(--font-sans)",
  },
  danger: {
    padding: "9px 16px",
    background: "var(--danger)",
    color: "var(--accent-ink)",
    font: "600 13px/1 var(--font-sans)",
  },
  secondary: {
    padding: "9px 15px",
    background: "transparent",
    color: "var(--text-2)",
    font: "500 13px/1 var(--font-sans)",
  },
};

/** Hover background per kind — primary deepens to accent-hover, danger darkens, secondary fills. */
const BUTTON_HOVER: Record<ModalButtonKind, string> = {
  primary: "var(--accent-hover)",
  danger: "var(--danger)",
  secondary: "var(--surface-2)",
};

/** A footer button styled 1:1 with the handoff modal actions, with a hover state. */
export function ModalButton({
  kind = "secondary",
  onClick,
  disabled,
  children,
}: {
  kind?: ModalButtonKind;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const active = hover && !disabled;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...BUTTON_STYLE[kind],
        borderRadius: 11,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        background: active ? BUTTON_HOVER[kind] : BUTTON_STYLE[kind].background,
        color: active && kind === "secondary" ? "var(--text)" : BUTTON_STYLE[kind].color,
        filter: active && kind === "danger" ? "brightness(0.94)" : "none",
        transition: "background var(--transition-fast), color var(--transition-fast), filter var(--transition-fast)",
      }}
    >
      {children}
    </button>
  );
}
