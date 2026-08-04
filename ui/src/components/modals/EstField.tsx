// Editable estimated-session-length field (TECH-09.2, AD-010), shared by the new/edit card modals.
// A card with a technique carries an estimate the user can override within 5–180 minutes; values
// outside that range show an inline error (mirroring the core `EstOutOfRange` bound) so the parent
// can keep "Criar"/"Salvar" disabled until it is valid.

import { EST_MAX, EST_MIN, isEstInRange } from "../../lib/sessionEstimate";

export interface EstFieldProps {
  /** Current estimate in minutes (null before a technique sets one). */
  value: number | null;
  onChange: (minutes: number | null) => void;
}

const LABEL_CSS = {
  font: "600 11.5px/1 var(--font-sans)",
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "var(--text-2)",
} as const;

export function EstField({ value, onChange }: EstFieldProps) {
  const invalid = value !== null && !isEstInRange(value);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <span style={LABEL_CSS}>Duração estimada</span>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          type="number"
          min={EST_MIN}
          max={EST_MAX}
          value={value ?? ""}
          aria-label="Duração estimada em minutos"
          aria-invalid={invalid}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          style={{
            width: 96,
            padding: "10px 12px",
            borderRadius: 11,
            background: "var(--bg)",
            border: `1.5px solid ${invalid ? "var(--danger)" : "var(--border-strong)"}`,
            color: "var(--text)",
            font: "500 14px/1.3 var(--font-sans)",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <span style={{ font: "500 12.5px/1 var(--font-sans)", color: "var(--text-3)" }}>minutos</span>
      </div>
      {invalid && (
        <span
          style={{
            font: "500 11.5px/1.3 var(--font-sans)",
            color: "var(--danger-ink)",
          }}
        >
          A duração deve ficar entre {EST_MIN} e {EST_MAX} minutos.
        </span>
      )}
    </div>
  );
}
