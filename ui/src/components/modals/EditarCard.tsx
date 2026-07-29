// Edit card modal (METH-03, TECH-01 — handoff "ModalEditarCard"). Adjusts an existing card's
// title, links and technique. The method is shown read-only (a card's method is fixed at creation,
// METH-01 §4 — "the scheduling stays the same"), so there is no method control here.
//
// The title carries the same 1–200 validation as the new-card modal and "Salvar" is disabled while
// it is invalid. Closing with unsaved edits raises a discard-confirmation (handoff "Descartar as
// alterações?"). Composes the shared ModalShell.

import { useState } from "react";
import type { Card, Technique } from "../../lib/bindings";
import { ModalShell } from "../ModalShell";
import { TECHNIQUE_LABEL, TECHNIQUE_SUMMARY } from "../TechniqueChip";
import {
  TECHNIQUE_CHOICES,
  type TechniqueChoice,
  TITLE_MAX,
  titleCharCount,
  validateTitle,
} from "./validation";

export interface EditarCardModalProps {
  open?: boolean;
  /** The card being edited (source of the initial form values + the immutable method/schedule). */
  card: Card;
  onClose?: () => void;
  /** Emitted with the updated card (same id/method/schedule) when "Salvar" is pressed. */
  onSave?: (card: Card) => void;
}

const METHOD_LABEL = {
  SpacedRepetition: "Repetição Espaçada",
  ExamPrep: "Prova",
} as const;

const CHOICE_LABEL: Record<TechniqueChoice, string> = {
  none: "Nenhuma",
  Pomodoro: TECHNIQUE_LABEL.Pomodoro,
  ActiveRecall: TECHNIQUE_LABEL.ActiveRecall,
  Feynman: TECHNIQUE_LABEL.Feynman,
  Leitner: TECHNIQUE_LABEL.Leitner,
};

const CHOICE_DESC: Record<TechniqueChoice, string> = {
  none: "Estudo livre, sem técnica guiada.",
  Pomodoro: TECHNIQUE_SUMMARY.Pomodoro,
  ActiveRecall: TECHNIQUE_SUMMARY.ActiveRecall,
  Feynman: TECHNIQUE_SUMMARY.Feynman,
  Leitner: TECHNIQUE_SUMMARY.Leitner,
};

const LABEL_CSS = {
  font: "600 11.5px/1 var(--font-sans)",
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "var(--text-2)",
} as const;

function toChoice(technique: Technique | null): TechniqueChoice {
  return technique ?? "none";
}

export function EditarCardModal({ open = true, card, onClose, onSave }: EditarCardModalProps) {
  const [title, setTitle] = useState(card.title);
  const [contentLink, setContentLink] = useState(card.content_link);
  const [reviewLink, setReviewLink] = useState(card.review_link);
  const [choice, setChoice] = useState<TechniqueChoice>(toChoice(card.technique));
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const titleCheck = validateTitle(title);
  const count = titleCharCount(title);
  const over = count > TITLE_MAX;

  const dirty =
    title !== card.title ||
    contentLink !== card.content_link ||
    reviewLink !== card.review_link ||
    choice !== toChoice(card.technique);

  function requestClose() {
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose?.();
  }

  function save() {
    if (!titleCheck.valid) return;
    const technique: Technique | null = choice === "none" ? null : choice;
    onSave?.({
      ...card,
      title: title.trim(),
      content_link: contentLink.trim(),
      review_link: reviewLink.trim(),
      technique,
    });
  }

  return (
    <ModalShell
      open={open}
      title="Editar card"
      subtitle="Ajuste os detalhes. O agendamento continua o mesmo."
      onClose={requestClose}
      footer={
        <>
          {dirty && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                marginRight: "auto",
                font: "500 11.5px/1.3 var(--font-sans)",
                color: "var(--atraso-ink)",
              }}
            >
              <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: "currentColor" }} />
              Alterações não salvas
            </span>
          )}
          <button type="button" onClick={requestClose} style={ghostBtn}>
            Cancelar
          </button>
          <button type="button" onClick={save} disabled={!titleCheck.valid} style={primaryBtn(titleCheck.valid)}>
            Salvar
          </button>
        </>
      }
    >
      {/* Título */}
      <Field>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={LABEL_CSS}>Título</span>
          <span style={{ flex: 1 }} />
          <span
            style={{
              font: "400 10.5px/1 var(--font-mono, var(--font-sans))",
              color: over ? "var(--danger-ink)" : "var(--text-3)",
            }}
          >
            {count}/{TITLE_MAX}
          </span>
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Título"
          aria-invalid={!titleCheck.valid}
          style={textInput(!titleCheck.valid)}
        />
        {!titleCheck.valid && <span style={errorText}>{titleCheck.message}</span>}
      </Field>

      {/* Links */}
      <div style={{ display: "flex", gap: 12 }}>
        <Field style={{ flex: 1 }}>
          <span style={LABEL_CSS}>Link de conteúdo</span>
          <input
            value={contentLink}
            onChange={(e) => setContentLink(e.target.value)}
            aria-label="Link de conteúdo"
            style={textInput(false)}
          />
        </Field>
        <Field style={{ flex: 1 }}>
          <span style={LABEL_CSS}>Link de revisão</span>
          <input
            value={reviewLink}
            onChange={(e) => setReviewLink(e.target.value)}
            aria-label="Link de revisão"
            style={textInput(false)}
          />
        </Field>
      </div>

      {/* Método — read-only */}
      <Field>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={LABEL_CSS}>Método</span>
          <span
            style={{
              padding: "2px 7px",
              borderRadius: 6,
              background: "var(--surface-2)",
              color: "var(--text-3)",
              font: "500 9px/1.4 var(--font-sans)",
              letterSpacing: ".04em",
              textTransform: "uppercase",
            }}
          >
            somente leitura
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "11px 13px",
            borderRadius: 12,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
          }}
        >
          <span aria-hidden style={{ width: 9, height: 9, borderRadius: 999, background: "var(--accent)", flex: "none" }} />
          <span style={{ flex: 1, font: "500 13px/1.2 var(--font-sans)", color: "var(--text-2)" }}>
            {METHOD_LABEL[card.method]}
          </span>
        </div>
        <span style={{ font: "400 10.5px/1.35 var(--font-sans)", color: "var(--text-3)" }}>
          O método define o agendamento e não pode mudar depois de criado. Crie um novo card se
          precisar de outro método.
        </span>
      </Field>

      {/* Técnica */}
      <Field>
        <span style={LABEL_CSS}>Técnica</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {TECHNIQUE_CHOICES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={choice === c}
              onClick={() => setChoice(c)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 2,
                textAlign: "left",
                padding: "9px 12px",
                borderRadius: 11,
                cursor: "pointer",
                background: choice === c ? "var(--accent-soft)" : "var(--surface-2)",
                border: `1px solid ${choice === c ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              <span style={{ font: "600 12.5px/1.25 var(--font-sans)", color: choice === c ? "var(--accent-soft-ink)" : "var(--text)" }}>
                {CHOICE_LABEL[c]}
              </span>
              <span style={{ font: "400 11px/1.3 var(--font-sans)", color: "var(--text-3)" }}>
                {CHOICE_DESC[c]}
              </span>
            </button>
          ))}
        </div>
      </Field>

      {/* Discard-confirmation overlay (unsaved-changes warning) */}
      {confirmDiscard && (
        <div
          role="alertdialog"
          aria-label="Descartar as alterações?"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 110,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "oklch(0.15 0.03 300 / 0.5)",
          }}
          onClick={() => setConfirmDiscard(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(404px, 100%)",
              display: "flex",
              flexDirection: "column",
              gap: 18,
              padding: 26,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              boxShadow: "var(--shadow-2)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <span style={{ font: "600 18px/1.25 var(--font-sans)", color: "var(--text)" }}>
                Descartar as alterações?
              </span>
              <span style={{ font: "400 13px/1.55 var(--font-sans)", color: "var(--text-2)" }}>
                Você editou este card e ainda não salvou. Se fechar agora, essas mudanças se perdem.
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <button
                type="button"
                onClick={() => setConfirmDiscard(false)}
                style={{ ...primaryBtn(true), textAlign: "center" }}
              >
                Continuar editando
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDiscard(false);
                  onClose?.();
                }}
                style={{
                  padding: 11,
                  borderRadius: 12,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--danger-ink)",
                  font: "600 13px/1 var(--font-sans)",
                  cursor: "pointer",
                }}
              >
                Descartar e fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

function Field({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7, ...style }}>
      {children}
    </div>
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
    font: "500 14px/1.3 var(--font-sans)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };
}

const errorText: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  font: "500 11.5px/1.3 var(--font-sans)",
  color: "var(--danger-ink)",
};
