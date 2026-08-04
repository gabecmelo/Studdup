// Link row (handoff "Linha de link"). Shows a card link with an "Abrir no navegador" action when
// openable; when the value is not a resolvable URL or absolute file path it renders greyed with a
// "não-abrível" marker and a disabled action (spec edge case / security — the OS opens links, they
// are never executed as shell commands).

import { isOpenableLink } from "./links";

export interface LinkRowProps {
  label: string;
  url: string;
  /** Called with the url when the openable action is clicked (wired to the opener plugin later). */
  onOpen?: (url: string) => void;
}

export function LinkRow({ label, url, onOpen }: LinkRowProps) {
  const openable = isOpenableLink(url);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        opacity: openable ? 1 : 0.7,
      }}
    >
      <span
        aria-hidden
        style={{
          flex: "none",
          font: "600 12px/1 var(--font-sans)",
          color: openable ? "var(--accent)" : "var(--text-3)",
        }}
      >
        {openable ? "↗" : "⦸"}
      </span>

      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
        <span
          style={{
            font: "600 13.5px/1.3 var(--font-sans)",
            color: "var(--text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        {!openable && (
          <span
            style={{
              font: "600 10.5px/1 var(--font-sans)",
              textTransform: "uppercase",
              letterSpacing: ".08em",
              color: "var(--atraso-ink)",
            }}
          >
            não-abrível
          </span>
        )}
      </div>

      <button
        type="button"
        disabled={!openable}
        onClick={openable ? () => onOpen?.(url) : undefined}
        style={{
          font: "600 12.5px/1 var(--font-sans)",
          whiteSpace: "nowrap",
          padding: "8px 12px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)",
          background: "transparent",
          color: openable ? "var(--text)" : "var(--text-3)",
          cursor: openable ? "pointer" : "not-allowed",
        }}
      >
        Abrir no navegador
      </button>
    </div>
  );
}
