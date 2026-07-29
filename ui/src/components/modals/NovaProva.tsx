// New exam modal (EXAM-01 — handoff "ModalNovaProva"). Captures an exam name and target date; the
// backend then distributes each of its cards' study sessions up to that date (EXAM-02). The date is
// validated against the core's bounds via the pure `examValidation` helper (today .. today+5y), and
// "Criar prova" stays disabled until the name is non-empty and the date is valid, with an inline
// error otherwise. Composes the shared ModalShell.
//
// A native date input is used for the picker (it yields an ISO `YYYY-MM-DD` value directly and is
// bounded by min/max); the handoff's bespoke calendar is not reproduced pixel-for-pixel.

import { useState } from "react";
import type { ISODate } from "../../lib/bindings";
import { ModalShell } from "../ModalShell";
import { maxExamDate, validateExamDate } from "./examValidation";

export interface NovaProvaModalProps {
  open?: boolean;
  today: ISODate;
  onCreate?: (name: string, examDate: ISODate) => void;
  onClose?: () => void;
}

const LABEL_CSS = {
  font: "600 11.5px/1 var(--font-sans)",
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "var(--text-2)",
} as const;

export function NovaProvaModal({ open = true, today, onCreate, onClose }: NovaProvaModalProps) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [touched, setTouched] = useState(false);

  const dateCheck = validateExamDate(date, today);
  const nameValid = name.trim().length > 0;
  const valid = nameValid && dateCheck.valid;

  function submit() {
    if (!valid) {
      setTouched(true);
      return;
    }
    onCreate?.(name.trim(), date);
  }

  return (
    <ModalShell
      open={open}
      title="Nova prova"
      subtitle="Diga o nome e a data. O Studdup distribui as sessões de estudo até lá."
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} style={ghostBtn}>
            Cancelar
          </button>
          <button type="button" onClick={submit} disabled={!valid} style={primaryBtn(valid)}>
            Criar prova
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <span style={LABEL_CSS}>Nome da prova</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="Ex.: ENEM 2026 · Biologia"
          aria-label="Nome da prova"
          style={textInput(false)}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <span style={LABEL_CSS}>Data da prova</span>
        <input
          type="date"
          value={date}
          min={today}
          max={maxExamDate(today)}
          onChange={(e) => setDate(e.target.value)}
          onBlur={() => setTouched(true)}
          aria-label="Data da prova"
          aria-invalid={touched && !dateCheck.valid}
          style={textInput(touched && !dateCheck.valid)}
        />
        {touched && !dateCheck.valid && date.length > 0 && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              font: "500 12px/1.4 var(--font-sans)",
              color: "var(--danger-ink)",
            }}
          >
            {dateCheck.message}
          </span>
        )}
        {dateCheck.valid && (
          <span style={{ display: "flex", alignItems: "center", gap: 8, font: "400 11.5px/1.4 var(--font-sans)", color: "var(--text-2)" }}>
            <span aria-hidden style={{ width: 5, height: 5, borderRadius: 999, background: "var(--accent)", flex: "none" }} />
            O Studdup distribui as sessões, mais densas conforme a prova se aproxima.
          </span>
        )}
      </div>
    </ModalShell>
  );
}

const ghostBtn: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 11,
  border: "none",
  background: "transparent",
  color: "var(--text-2)",
  font: "600 13px/1 var(--font-sans)",
  cursor: "pointer",
};

function primaryBtn(enabled: boolean): React.CSSProperties {
  return {
    padding: "10px 20px",
    borderRadius: 11,
    border: "none",
    font: "600 13px/1 var(--font-sans)",
    background: enabled ? "var(--accent)" : "var(--surface-3)",
    color: enabled ? "var(--accent-ink)" : "var(--text-3)",
    cursor: enabled ? "pointer" : "not-allowed",
    boxShadow: enabled ? "var(--shadow-accent)" : "none",
  };
}

function textInput(error: boolean): React.CSSProperties {
  return {
    padding: "11px 13px",
    borderRadius: 12,
    background: "var(--bg)",
    border: `1.5px solid ${error ? "var(--danger)" : "var(--border-strong)"}`,
    color: "var(--text)",
    font: "500 13.5px/1.3 var(--font-sans)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };
}
