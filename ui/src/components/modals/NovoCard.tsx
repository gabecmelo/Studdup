// New card modal (METH-03, TECH-01 — handoff "ModalNovoCard"). Captures a topic to study: title
// (1–200 chars with a live counter and inline validation), a content link and an optional review
// link, the study method (a segmented control defaulting to the currently active method, METH-03 §3),
// the exam to attach when the method is Prova, and an optional technique picked from the four
// techniques (each with a one-line description, TECH-01) or "Nenhuma".
//
// "Criar card" stays disabled until the form is valid (title valid and, for Prova, an exam chosen),
// matching the mock. Composes the shared ModalShell. Per-technique session-length defaults and the
// Pomodoro rhythm are applied in T31; this modal only records the technique choice.

import { useState } from "react";
import type { Card, Method, PomodoroRhythm, Technique } from "../../lib/bindings";
import { ModalShell } from "../ModalShell";
import { RhythmPicker } from "../RhythmPicker";
import { HelpButton } from "../HelpButton";
import { METHOD_HELP, TECHNIQUE_HELP } from "../../lib/studyHelp";
import { TECHNIQUE_LABEL, TECHNIQUE_SUMMARY } from "../TechniqueChip";
import {
  DEFAULT_RHYTHM,
  defaultEstForTechnique,
  estFromRhythm,
  isEstInRange,
} from "../../lib/sessionEstimate";
import { EstField } from "./EstField";
import { todayIso } from "../Board";
import {
  TECHNIQUE_CHOICES,
  type TechniqueChoice,
  TITLE_MAX,
  titleCharCount,
  validateTitle,
} from "./validation";

/** An exam the card can be attached to when the method is Prova. */
export interface ExamOption {
  id: number;
  name: string;
}

export interface NovoCardModalProps {
  open?: boolean;
  /** The currently active method — the default for a new card (METH-03 §3). */
  activeMethod: Method;
  /** Exams available to attach when the method is Prova (empty → the "create a prova first" hint). */
  exams?: ExamOption[];
  /**
   * Global per-technique default estimates (from settings, TECH-09.5). Applied to a new card when a
   * technique is chosen; falls back to the built-in defaults when a technique has no global override.
   * Only affects cards created afterwards (AD-010) — this modal reads it, never writes it.
   */
  defaultEst?: Partial<Record<Technique, number>>;
  onClose?: () => void;
  /** Emitted with the assembled card when "Criar card" is pressed on a valid form. */
  onCreate?: (card: Card) => void;
  /** Optional shortcut to the Nova Prova flow, surfaced when the user picks Prova with no exams. */
  onCreateExam?: () => void;
}

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

export function NovoCardModal({
  open = true,
  activeMethod,
  exams = [],
  defaultEst,
  onClose,
  onCreate,
  onCreateExam,
}: NovoCardModalProps) {
  const [title, setTitle] = useState("");
  const [contentLink, setContentLink] = useState("");
  const [reviewLink, setReviewLink] = useState("");
  const [method, setMethod] = useState<Method>(activeMethod);
  const [examId, setExamId] = useState<number | null>(null);
  const [choice, setChoice] = useState<TechniqueChoice>("none");
  // Estimated session length + Pomodoro rhythm (TECH-09). `est` is null while no technique is chosen.
  const [est, setEst] = useState<number | null>(null);
  const [rhythm, setRhythm] = useState<PomodoroRhythm>(DEFAULT_RHYTHM);
  const [touched, setTouched] = useState(false);

  const titleCheck = validateTitle(title);
  const count = titleCharCount(title);
  const over = count > TITLE_MAX;
  const needsExam = method === "ExamPrep";
  const hasTechnique = choice !== "none";
  // A chosen technique must carry a valid estimate (5–180); "none" has no estimate (TECH-09.2).
  const estOk = !hasTechnique || (est !== null && isEstInRange(est));
  const valid = titleCheck.valid && (!needsExam || examId !== null) && estOk;

  /** Pick a technique: apply its default estimate (global override or built-in), TECH-09.1/5. */
  function pickTechnique(next: TechniqueChoice) {
    setChoice(next);
    if (next === "none") {
      setEst(null);
      return;
    }
    const global = defaultEst?.[next];
    setEst(global ?? defaultEstForTechnique(next, rhythm));
  }

  /** Changing the Pomodoro rhythm re-derives the estimate from its focus block (TECH-09.4). */
  function pickRhythm(next: PomodoroRhythm) {
    setRhythm(next);
    setEst(estFromRhythm(next));
  }

  function submit() {
    if (!valid) {
      setTouched(true);
      return;
    }
    const technique: Technique | null = choice === "none" ? null : choice;
    const card: Card = {
      id: 0,
      title: title.trim(),
      content_link: contentLink.trim(),
      review_link: reviewLink.trim(),
      method,
      technique,
      est_minutes: technique === null ? null : est,
      pomodoro: technique === "Pomodoro" ? rhythm : null,
      // Scheduling anchors are (re)assigned by the backend (create_card forces today / Day 0). They
      // must still be valid ISO dates here — `Date` rejects an empty string on deserialization — so
      // seed them with today; the value is overwritten server-side.
      start_date: todayIso(),
      current_stage: "Day0",
      exam_id: needsExam ? examId : null,
      created_at: todayIso(),
      last_completed_at: null,
      archived: false,
    };
    onCreate?.(card);
  }

  return (
    <ModalShell
      open={open}
      title="Novo card"
      subtitle="Um tópico pra estudar. O Studdup cuida do quando."
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} style={ghostBtn}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!valid}
            style={primaryBtn(valid)}
          >
            Criar card
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
          onBlur={() => setTouched(true)}
          placeholder="Ex.: Genética — 2ª Lei de Mendel"
          aria-label="Título"
          aria-invalid={touched && !titleCheck.valid}
          style={textInput(touched && !titleCheck.valid)}
        />
        {touched && !titleCheck.valid && (
          <span style={errorText}>{titleCheck.message}</span>
        )}
      </Field>

      {/* Links */}
      <div style={{ display: "flex", gap: 12 }}>
        <Field style={{ flex: 1 }}>
          <span style={LABEL_CSS}>Link de conteúdo</span>
          <input
            value={contentLink}
            onChange={(e) => setContentLink(e.target.value)}
            placeholder="colar URL"
            aria-label="Link de conteúdo"
            style={textInput(false)}
          />
        </Field>
        <Field style={{ flex: 1 }}>
          <span style={LABEL_CSS}>Link de revisão</span>
          <input
            value={reviewLink}
            onChange={(e) => setReviewLink(e.target.value)}
            placeholder="opcional"
            aria-label="Link de revisão"
            style={textInput(false)}
          />
        </Field>
      </div>

      {/* Método (defaults to the active method) */}
      <Field>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={LABEL_CSS}>Método</span>
          <HelpButton topic={METHOD_HELP[method]} ariaLabel="Como usar este método no app" />
        </div>
        <div
          role="radiogroup"
          aria-label="Método"
          style={{
            display: "flex",
            gap: 5,
            padding: 5,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 13,
          }}
        >
          <MethodOption
            label="Repetição Espaçada"
            selected={method === "SpacedRepetition"}
            onClick={() => setMethod("SpacedRepetition")}
          />
          <MethodOption
            label="Prova"
            selected={method === "ExamPrep"}
            onClick={() => setMethod("ExamPrep")}
          />
        </div>
        <span style={{ font: "400 10.5px/1.3 var(--font-sans)", color: "var(--text-3)" }}>
          {method === "ExamPrep"
            ? "Sessões distribuídas até a data da prova."
            : "Revisões espaçadas do Dia 0 ao Dia 30. Padrão do seu método ativo."}
        </span>
      </Field>

      {/* Prova (only for the exam method) */}
      {needsExam && (
        <Field>
          <span style={LABEL_CSS}>Prova</span>
          {exams.length === 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: 13,
                borderRadius: 12,
                background: "var(--atraso-soft)",
                color: "var(--atraso-ink)",
                font: "500 12px/1.4 var(--font-sans)",
              }}
            >
              <span style={{ flex: 1 }}>
                Você ainda não tem provas cadastradas. Crie uma prova antes de vincular o card.
              </span>
              {onCreateExam && (
                <button type="button" onClick={onCreateExam} style={{ ...ghostBtn, background: "var(--surface)", color: "var(--text)" }}>
                  Nova Prova
                </button>
              )}
            </div>
          ) : (
            <select
              value={examId ?? ""}
              onChange={(e) => setExamId(e.target.value === "" ? null : Number(e.target.value))}
              aria-label="Prova"
              style={textInput(false)}
            >
              <option value="">Selecione uma prova</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}

      {/* Técnica */}
      <Field>
        <span style={LABEL_CSS}>Técnica</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {TECHNIQUE_CHOICES.map((c) => (
            <div key={c} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                aria-pressed={choice === c}
                onClick={() => pickTechnique(c)}
                style={{
                  flex: 1,
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
              {c !== "none" && (
                <HelpButton topic={TECHNIQUE_HELP[c]} ariaLabel={`Como usar ${CHOICE_LABEL[c]} no app`} />
              )}
            </div>
          ))}
        </div>
      </Field>

      {/* Ritmo Pomodoro + estimativa (TECH-09) — only when a technique is chosen */}
      {choice === "Pomodoro" && (
        <Field>
          <span style={LABEL_CSS}>Ritmo</span>
          <RhythmPicker value={rhythm} onChange={pickRhythm} />
        </Field>
      )}
      {hasTechnique && (
        <EstField value={est} onChange={setEst} />
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

function MethodOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: 10,
        borderRadius: 9,
        border: "none",
        cursor: "pointer",
        font: `${selected ? 600 : 500} 12.5px/1 var(--font-sans)`,
        background: selected ? "var(--accent)" : "transparent",
        color: selected ? "var(--accent-ink)" : "var(--text-2)",
        boxShadow: selected ? "var(--shadow-1)" : "none",
      }}
    >
      {label}
    </button>
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
