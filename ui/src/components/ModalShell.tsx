// Modal shell (handoff "Shell de modal"). The reusable overlay + panel chrome only — title,
// optional subtitle, body slot and a footer for actions. The feature modals (new/edit card,
// overdue, postpone, exams…) compose this in later tasks; this is just the container.

import type { ReactNode } from "react";

export interface ModalShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  /** When false the shell renders nothing (kept controlled by the caller). Defaults to true. */
  open?: boolean;
}

export function ModalShell({
  title,
  subtitle,
  children,
  footer,
  onClose,
  open = true,
}: ModalShellProps) {
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
          gap: 18,
          width: "min(480px, 100%)",
          maxHeight: "calc(100vh - 48px)",
          padding: 24,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "var(--shadow-2)",
        }}
      >
        <header style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ font: "600 16px/1.3 var(--font-sans)", color: "var(--text)" }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ font: "400 13px/1.5 var(--font-sans)", color: "var(--text-2)" }}>
              {subtitle}
            </div>
          )}
        </header>

        <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          {children}
        </div>

        {footer && (
          <footer style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
