// Postpone modal (KAN-02 reschedule semantics — handoff "ModalAdiar"). Postpones a card by a chosen
// number of days. For a *review* (a stage past the first, AD-003) it first offers the valued 5-minute
// review challenge (context.md): a focused countdown the user can pause/resume, after which the modal
// asks "Você revisou?" — Sim completes the review (agenda o próximo estágio), Não postpones it. A
// first-session card skips straight to the postpone options.
//
// The countdown logic is the pure `reviewTimer` state machine (unit-tested); this component drives it
// with a 1-second interval and renders the handoff's ring/clock via the shared Countdown.

import { useEffect, useState } from "react";
import type { ISODate, Stage, Technique } from "../../lib/bindings";
import { useEscapeToClose } from "../../lib/useEscapeToClose";
import { Countdown, formatClock } from "../Countdown";
import { addDaysIso } from "../Board";
import { daysBetween } from "../columns";
import { TECHNIQUE_LABEL } from "../TechniqueChip";
import {
  createTimer,
  isReviewStage,
  pauseTimer,
  resumeTimer,
  startTimer,
  tick,
  type TimerState,
} from "./reviewTimer";

const OVERLAY: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 105,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  background: "oklch(0 0 0 / 0.42)",
};

const STAGE_LABEL: Record<Stage, string> = {
  Day0: "Dia 0",
  Day1: "Dia 1",
  Day2: "Dia 2",
  Day5: "Dia 5",
  Day15: "Dia 15",
  Day30: "Dia 30",
  Done: "Concluído",
};

/** The postpone presets, expressed as day offsets **from today** (not from the card's current due
 *  date): postponing an overdue card to "Amanhã" always lands on tomorrow, never in the past. */
const POSTPONE_OPTIONS: { label: string; fromToday: number }[] = [
  { label: "Amanhã", fromToday: 1 },
  { label: "Em 2 dias", fromToday: 2 },
  { label: "Em 3 dias", fromToday: 3 },
  { label: "Em 1 semana", fromToday: 7 },
];

type Mode = "choose" | "challenge" | "timer" | "question";

/** The `days` delta to hand the postpone command so the schedule lands exactly on `target`. The
 *  backend adds this to the card's current due date, so the delta is `target − currentDue`
 *  (`daysBetween` is `to − from`). Computing from `currentDue` — not from `target − today` — means
 *  an overdue card postponed to tomorrow still lands on tomorrow, never a past day. */
export function postponeDeltaDays(currentDue: ISODate, target: ISODate): number {
  return daysBetween(currentDue, target);
}

export interface AdiarModalProps {
  open?: boolean;
  cardTitle: string;
  stage: Stage;
  technique: Technique | null;
  /** Today (local ISO date) — postpone targets are chosen relative to today, never the due date. */
  today: ISODate;
  /** The card's current due date — the delta passed to `onPostpone` is `target − dueDate`, so the
   *  backend's schedule lands exactly on the chosen target day regardless of how overdue it was. */
  dueDate: ISODate;
  onPostpone?: (days: number) => void;
  onComplete?: () => void;
  onClose?: () => void;
}

export function AdiarModal({
  open = true,
  cardTitle,
  stage,
  technique,
  today,
  dueDate,
  onPostpone,
  onComplete,
  onClose,
}: AdiarModalProps) {
  const review = isReviewStage(stage);
  const [mode, setMode] = useState<Mode>(review ? "challenge" : "choose");
  // The chosen postpone target as an absolute date; defaults to tomorrow.
  const [target, setTarget] = useState<ISODate>(addDaysIso(today, 1));
  const [timer, setTimer] = useState<TimerState>(createTimer());

  // Drive the countdown once per second while it is running; flip to the question at zero.
  useEffect(() => {
    if (mode !== "timer" || timer.phase !== "running") return;
    const id = setInterval(() => setTimer((t) => tick(t, 1)), 1000);
    return () => clearInterval(id);
  }, [mode, timer.phase]);

  useEffect(() => {
    if (timer.phase === "done") setMode("question");
  }, [timer.phase]);

  useEscapeToClose(open ? onClose : undefined);

  if (!open) return null;

  const techniqueLabel = technique ? TECHNIQUE_LABEL[technique] : null;

  function beginTimer() {
    setTimer(startTimer(createTimer()));
    setMode("timer");
  }

  return (
    <div role="presentation" onClick={onClose} style={OVERLAY}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Adiar"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(492px, 100%)",
          display: "flex",
          flexDirection: "column",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "var(--shadow-2)",
          overflow: "hidden",
        }}
      >
        <Header
          title={mode === "choose" ? (review ? "Adiar revisão" : "Adiar card") : mode === "question" ? "Terminou o tempo" : "5 minutos de revisão"}
          subtitle={`${cardTitle} · ${STAGE_LABEL[stage]}`}
          onClose={onClose}
        />

        <div style={{ display: "flex", flexDirection: "column", padding: "20px 24px" }}>
          {mode === "choose" && (
            <ChooseMode
              today={today}
              target={target}
              onPick={setTarget}
              onConfirm={() => onPostpone?.(postponeDeltaDays(dueDate, target))}
              onCancel={onClose}
            />
          )}

          {mode === "challenge" && (
            <ChallengeMode
              stage={stage}
              techniqueLabel={techniqueLabel}
              onStudy={beginTimer}
              onSkip={() => setMode("choose")}
            />
          )}

          {mode === "timer" && (
            <TimerMode
              timer={timer}
              techniqueLabel={techniqueLabel}
              onPauseToggle={() =>
                setTimer((t) => (t.phase === "paused" ? resumeTimer(t) : pauseTimer(t)))
              }
              onGiveUp={() => setMode("choose")}
            />
          )}

          {mode === "question" && (
            <QuestionMode onYes={onComplete} onNo={() => setMode("choose")} />
          )}
        </div>
      </div>
    </div>
  );
}

function Header({ title, subtitle, onClose }: { title: string; subtitle: string; onClose?: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        padding: "22px 24px 16px",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ font: "600 18px/1.2 var(--font-sans)", letterSpacing: "-.02em", color: "var(--text)" }}>
          {title}
        </span>
        <span style={{ font: "400 12.5px/1.45 var(--font-sans)", color: "var(--text-2)" }}>{subtitle}</span>
      </div>
      <HoverButton onClick={onClose} base={closeBtn} hoverPatch={PATCH_GHOST} ariaLabel="Fechar">
        ✕
      </HoverButton>
    </div>
  );
}

function ChooseMode({
  today,
  target,
  onPick,
  onConfirm,
  onCancel,
}: {
  today: ISODate;
  target: ISODate;
  onPick: (target: ISODate) => void;
  onConfirm: () => void;
  onCancel?: () => void;
}) {
  const tomorrow = addDaysIso(today, 1);
  // Guard against a cleared/invalid date input: only a day strictly after today can be a postpone.
  const valid = target >= tomorrow;
  const offsetFromToday = daysBetween(today, target);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <span style={{ font: "600 11.5px/1 var(--font-sans)", letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-2)" }}>
        Adiar para
      </span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 9 }}>
        {POSTPONE_OPTIONS.map((o) => {
          const optionDate = addDaysIso(today, o.fromToday);
          const selected = optionDate === target;
          return (
            <HoverButton
              key={o.fromToday}
              ariaPressed={selected}
              onClick={() => onPick(optionDate)}
              base={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "13px 15px",
                borderRadius: 13,
                cursor: "pointer",
                background: selected ? "var(--accent-soft)" : "var(--bg)",
                border: `1.5px solid ${selected ? "var(--accent)" : "var(--border-strong)"}`,
                color: selected ? "var(--accent-soft-ink)" : "var(--text)",
                font: "600 13.5px/1 var(--font-sans)",
              }}
              hoverPatch={selected ? {} : { background: "var(--surface-2)" }}
            >
              {o.label}
              <span style={{ font: "400 11px/1 var(--font-mono, var(--font-sans))", color: "var(--text-3)" }}>
                {optionDate.slice(5)}
              </span>
            </HoverButton>
          );
        })}
      </div>

      {/* Or pick an exact day directly — the base for all the calculations is today, never the
          (possibly overdue) current due date. */}
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "11px 15px",
          borderRadius: 13,
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
        }}
      >
        <span style={{ font: "500 12.5px/1 var(--font-sans)", color: "var(--text-2)" }}>Escolher dia</span>
        <span style={{ flex: 1 }} />
        <input
          type="date"
          value={target}
          min={tomorrow}
          onChange={(e) => e.target.value && onPick(e.target.value)}
          aria-label="Data de vencimento"
          style={{
            padding: "6px 10px",
            borderRadius: 9,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            font: "600 12.5px/1 var(--font-mono, var(--font-sans))",
            colorScheme: "dark light",
          }}
        />
      </label>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "13px 15px",
          borderRadius: 13,
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
        }}
      >
        <span style={{ font: "500 12.5px/1 var(--font-sans)", color: "var(--text-2)" }}>Nova data de vencimento</span>
        <span style={{ flex: 1 }} />
        <span style={{ font: "600 13.5px/1 var(--font-sans)", color: "var(--accent-soft-ink)" }}>
          {valid ? `${target} · em ${offsetFromToday} ${offsetFromToday === 1 ? "dia" : "dias"}` : "—"}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <HoverButton onClick={onCancel} base={ghostBtn} hoverPatch={PATCH_GHOST}>
          Cancelar
        </HoverButton>
        <HoverButton
          onClick={valid ? onConfirm : undefined}
          base={{ ...primaryBtn, opacity: valid ? 1 : 0.5, cursor: valid ? "pointer" : "not-allowed" }}
          hoverPatch={valid ? PATCH_PRIMARY : {}}
        >
          Adiar para {valid ? target : "…"}
        </HoverButton>
      </div>
    </div>
  );
}

function ChallengeMode({
  stage,
  techniqueLabel,
  onStudy,
  onSkip,
}: {
  stage: Stage;
  techniqueLabel: string | null;
  onStudy: () => void;
  onSkip: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center", padding: "6px 0" }}>
      <Pill bg="var(--revisar-soft)" ink="var(--revisar-ink)">
        Isto é uma revisão · {STAGE_LABEL[stage]}
      </Pill>
      <span style={{ font: "600 21px/1.25 var(--font-sans)", letterSpacing: "-.02em", maxWidth: 360, color: "var(--text)" }}>
        Antes de adiar, que tal 5 minutos?
      </span>
      <span style={{ font: "400 13px/1.55 var(--font-sans)", color: "var(--text-2)", maxWidth: 380 }}>
        Revisão rende mais em pequenas doses. Cinco minutos{techniqueLabel ? ` de ${techniqueLabel}` : ""} agora
        podem valer mais que empurrar para outro dia. Topa tentar?
      </span>
      <Countdown seconds={300} label="a começar" running={false} />
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 9 }}>
        <HoverButton onClick={onStudy} base={bigPrimary} hoverPatch={PATCH_PRIMARY}>
          Estudar 5 minutos agora
        </HoverButton>
        <HoverButton onClick={onSkip} base={bigGhost} hoverPatch={PATCH_GHOST}>
          Prefiro adiar mesmo assim
        </HoverButton>
      </div>
    </div>
  );
}

function TimerMode({
  timer,
  techniqueLabel,
  onPauseToggle,
  onGiveUp,
}: {
  timer: TimerState;
  techniqueLabel: string | null;
  onPauseToggle: () => void;
  onGiveUp: () => void;
}) {
  const paused = timer.phase === "paused";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center", padding: "6px 0" }}>
      <Pill bg={paused ? "var(--surface-3)" : "var(--revisar-soft)"} ink={paused ? "var(--text-2)" : "var(--revisar-ink)"}>
        {paused ? "Pausado" : "Revisando agora"}
      </Pill>
      <span style={{ font: "600 20px/1.25 var(--font-sans)", letterSpacing: "-.02em", maxWidth: 360, color: "var(--text)" }}>
        {paused ? "Timer pausado — respira e volta" : `Revise${techniqueLabel ? ` com ${techniqueLabel}` : ""} sem olhar o material`}
      </span>
      <div aria-label={`Tempo restante ${formatClock(timer.remaining)}`}>
        <Countdown seconds={timer.remaining} label={paused ? "pausado" : "restam"} running={!paused} />
      </div>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 9 }}>
        <HoverButton onClick={onPauseToggle} base={bigPrimary} hoverPatch={PATCH_PRIMARY}>
          {paused ? "Retomar" : "Pausar"}
        </HoverButton>
        <HoverButton onClick={onGiveUp} base={bigGhost} hoverPatch={PATCH_GHOST}>
          Desistir e adiar
        </HoverButton>
      </div>
    </div>
  );
}

function QuestionMode({ onYes, onNo }: { onYes?: () => void; onNo: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center", padding: "6px 0" }}>
      <Pill bg="var(--accent-soft)" ink="var(--accent-soft-ink)">
        Tempo! 5 minutos completos
      </Pill>
      <span style={{ font: "600 22px/1.25 var(--font-sans)", letterSpacing: "-.02em", color: "var(--text)" }}>
        Você revisou?
      </span>
      <span style={{ font: "400 13px/1.5 var(--font-sans)", color: "var(--text-2)", maxWidth: 360 }}>
        Sem pressão pela resposta certa — responda de verdade, é assim que o Studdup aprende o seu ritmo.
      </span>
      <div style={{ width: "100%", display: "flex", gap: 11, marginTop: 2 }}>
        <HoverButton
          onClick={onYes}
          base={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 7,
            padding: 16,
            borderRadius: 15,
            border: "none",
            cursor: "pointer",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            boxShadow: "var(--shadow-accent)",
            textAlign: "left",
          }}
          hoverPatch={PATCH_PRIMARY}
        >
          <span style={{ font: "600 15px/1.2 var(--font-sans)" }}>Sim, revisei</span>
          <span style={{ font: "400 11px/1.4 var(--font-sans)", opacity: 0.9 }}>
            Marca a revisão como feita e agenda o próximo estágio.
          </span>
        </HoverButton>
        <HoverButton
          onClick={onNo}
          base={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 7,
            padding: 16,
            borderRadius: 15,
            cursor: "pointer",
            background: "var(--bg)",
            border: "1.5px solid var(--border-strong)",
            color: "var(--text)",
            textAlign: "left",
          }}
          hoverPatch={PATCH_LIFT}
        >
          <span style={{ font: "600 15px/1.2 var(--font-sans)" }}>Não consegui</span>
          <span style={{ font: "400 11px/1.4 var(--font-sans)", color: "var(--text-2)" }}>
            Tudo bem — vamos adiar então, sem contar como revisão.
          </span>
        </HoverButton>
      </div>
    </div>
  );
}

/** A button with a base style plus a hover patch, shared by this modal's controls. */
function HoverButton({
  onClick,
  base,
  hoverPatch,
  ariaPressed,
  ariaLabel,
  children,
}: {
  onClick?: () => void;
  base: React.CSSProperties;
  hoverPatch: React.CSSProperties;
  ariaPressed?: boolean;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ariaPressed}
      aria-label={ariaLabel}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...base, ...(hover ? hoverPatch : null), transition: "background var(--transition-fast), color var(--transition-fast), box-shadow var(--transition-fast)" }}
    >
      {children}
    </button>
  );
}

const PATCH_PRIMARY: React.CSSProperties = { background: "var(--accent-hover)" };
const PATCH_GHOST: React.CSSProperties = { background: "var(--surface-2)", color: "var(--text)" };
const PATCH_LIFT: React.CSSProperties = { boxShadow: "var(--shadow-2)" };

function Pill({ children, bg, ink }: { children: React.ReactNode; bg: string; ink: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 12px",
        borderRadius: "var(--radius-pill)",
        background: bg,
        color: ink,
        font: "600 11px/1.3 var(--font-sans)",
      }}
    >
      <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: "currentColor" }} />
      {children}
    </span>
  );
}

const closeBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: "none",
  background: "transparent",
  color: "var(--text-3)",
  font: "400 16px/1 var(--font-sans)",
  cursor: "pointer",
  flex: "none",
};

const ghostBtn: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 11,
  border: "none",
  background: "transparent",
  color: "var(--text-2)",
  font: "600 13px/1 var(--font-sans)",
  cursor: "pointer",
};

const primaryBtn: React.CSSProperties = {
  padding: "10px 20px",
  borderRadius: 11,
  border: "none",
  background: "var(--accent)",
  color: "var(--accent-ink)",
  font: "600 13px/1 var(--font-sans)",
  cursor: "pointer",
  boxShadow: "var(--shadow-accent)",
};

const bigPrimary: React.CSSProperties = {
  padding: 13,
  borderRadius: 13,
  border: "none",
  background: "var(--accent)",
  color: "var(--accent-ink)",
  font: "600 14px/1 var(--font-sans)",
  cursor: "pointer",
  boxShadow: "var(--shadow-accent)",
};

const bigGhost: React.CSSProperties = {
  padding: 11,
  borderRadius: 12,
  border: "none",
  background: "transparent",
  color: "var(--text-2)",
  font: "600 13px/1 var(--font-sans)",
  cursor: "pointer",
};
