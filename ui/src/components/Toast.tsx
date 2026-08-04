// Toast (handoff "Toast"). A transient confirmation with an optional inline action (e.g. the
// "Desfazer" that reverts an optimistic board move on command failure — KAN-02/03 rollback).

export type ToastVariant = "success" | "danger" | "info";

export interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: ToastVariant;
}

const ICON: Record<ToastVariant, string> = {
  success: "✓",
  danger: "!",
  info: "i",
};

const ICON_COLOR: Record<ToastVariant, string> = {
  success: "var(--accent)",
  danger: "var(--danger)",
  info: "var(--text-2)",
};

export function Toast({
  message,
  actionLabel,
  onAction,
  variant = "success",
}: ToastProps) {
  return (
    <div
      role="status"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-2)",
      }}
    >
      <span
        aria-hidden
        style={{
          flex: "none",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
          borderRadius: "var(--radius-pill)",
          font: "600 12px/1 var(--font-sans)",
          background: "var(--surface-2)",
          color: ICON_COLOR[variant],
        }}
      >
        {ICON[variant]}
      </span>
      <span style={{ font: "500 13.5px/1.35 var(--font-sans)", color: "var(--text)" }}>
        {message}
      </span>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          style={{
            font: "600 12.5px/1 var(--font-sans)",
            color: "var(--accent)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
