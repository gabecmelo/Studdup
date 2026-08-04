// Pomodoro study session (TECH-02/03, handoff "SessaoPomodoro"). A full-screen focus/break session
// that runs the card's configured rhythm: a focus countdown, then — automatically at zero, with a
// notification — a break countdown, then done. Pause/resume holds the exact remaining time. Closing
// before the focus block completes asks whether to mark the card completed; on completion the elapsed
// focused seconds are recorded on the history event (via the parent's `onComplete`). All countdown
// logic lives in the pure `pomodoroTimer` machine; this screen only ticks it and renders it.

import { useEffect, useRef, useState } from "react";
import type { PomodoroRhythm } from "../lib/bindings";
import { Countdown } from "../components/Countdown";
import { EscapeCloser, useEscapeToClose } from "../lib/useEscapeToClose";
import { TechniqueReminder } from "./TechniqueReminder";
import {
  createPomodoro,
  isComplete,
  pause,
  type PomodoroState,
  resume,
  start,
  tick,
} from "./pomodoroTimer";

export interface PomodoroSessionProps {
  cardTitle: string;
  rhythm: PomodoroRhythm;
  /** Optional study material link, shown as "Abrir material". */
  contentLink?: string;
  /** Record the session as completed with the elapsed focused seconds (TECH-03). */
  onComplete: (focusedSecs: number) => void;
  /** Leave without completing — the card is left unchanged (TECH-02.5). */
  onExit: () => void;
}

/** Best-effort desktop notification for the focus→break transition (TECH-02.3). Never throws. */
function notifyBreak(): void {
  try {
    const N = (globalThis as { Notification?: typeof Notification }).Notification;
    if (N && N.permission === "granted") {
      new N("Foco concluído", { body: "Hora da pausa — levante e respire." });
    }
  } catch {
    // Notifications are best-effort; a failure must not break the session.
  }
}

export function PomodoroSession({
  cardTitle,
  rhythm,
  contentLink,
  onComplete,
  onExit,
}: PomodoroSessionProps) {
  const [timer, setTimer] = useState<PomodoroState>(() => createPomodoro(rhythm));
  const [confirmExit, setConfirmExit] = useState(false);
  const prevPhase = useRef(timer.phase);

  // 1 Hz tick while running — the pure machine owns every transition.
  useEffect(() => {
    if (!timer.running) return;
    const id = window.setInterval(() => setTimer((t) => tick(t, 1)), 1000);
    return () => window.clearInterval(id);
  }, [timer.running]);

  // Fire the notification exactly on the focus→break edge (TECH-02.3).
  useEffect(() => {
    if (prevPhase.current === "focus" && timer.phase === "break") {
      notifyBreak();
    }
    prevPhase.current = timer.phase;
  }, [timer.phase]);

  const done = isComplete(timer);
  const inFocus = timer.phase === "focus";
  const phaseLabel = timer.phase === "focus" ? "Foco" : timer.phase === "break" ? "Pausa" : "Concluído";
  const clockLabel = timer.running ? (inFocus ? "restam" : "de pausa") : done ? "sessão fim" : "pausado";

  function requestExit() {
    // Before the focus block completes, ask whether to count the study (TECH-02.5).
    if (timer.phase === "focus") {
      setConfirmExit(true);
    } else {
      onExit();
    }
  }

  useEscapeToClose(requestExit);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      {/* Top bar: card title + phase chip + material + exit */}
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 14, padding: "22px 30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: "var(--accent)" }} />
          <span
            style={{
              font: "600 14px/1.2 var(--font-sans)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {cardTitle}
          </span>
        </div>
        <span
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            font: "500 11px/1.4 var(--font-mono, var(--font-sans))",
            color: "var(--text-2)",
          }}
        >
          {phaseLabel} · Ciclo {timer.cycle} de {timer.cycles} · {rhythm.focus_min}/{rhythm.break_min}
        </span>
        <span style={{ flex: 1 }} />
        {contentLink && (
          <a
            href={contentLink}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "8px 13px",
              borderRadius: 11,
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text-2)",
              font: "500 12px/1 var(--font-sans)",
              textDecoration: "none",
            }}
          >
            Abrir material ↗
          </a>
        )}
        <HoverButton onClick={requestExit} base={exitBtn} hoverPatch={PATCH_EXIT}>
          Sair
        </HoverButton>
      </div>

      {/* How-to reminder for this technique (TECH-07.3) */}
      <TechniqueReminder technique="Pomodoro" />

      {/* Center: the countdown + controls */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 30,
          padding: 20,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, maxWidth: 440, textAlign: "center" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 15px",
              borderRadius: 999,
              background: inFocus ? "var(--accent-soft)" : "var(--revisar-soft)",
              color: inFocus ? "var(--accent-soft-ink)" : "var(--revisar-ink)",
              font: "600 12.5px/1.3 var(--font-sans)",
            }}
          >
            {phaseLabel}
          </span>
          <span style={{ font: "600 12px/1.3 var(--font-sans)", color: "var(--text-3)" }}>
            Ciclo {timer.cycle} de {timer.cycles}
          </span>
          <span style={{ font: "400 13.5px/1.4 var(--font-sans)", color: "var(--text-2)" }}>
            {inFocus
              ? "Uma coisa só. Sem trocar de aba — foco inteiro neste card."
              : timer.phase === "break"
                ? "Pausa de verdade. Levante, beba água, olhe pra longe."
                : "Sessão concluída. Marque o estudo pra agendar a próxima revisão."}
          </span>
        </div>

        <div
          style={{
            width: 300,
            height: 300,
            borderRadius: 999,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "var(--shadow-1)",
          }}
        >
          <Countdown seconds={timer.remaining} label={clockLabel} running={timer.running} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {done ? (
            <HoverButton onClick={() => onComplete(timer.focusedSecs)} base={primaryBtn} hoverPatch={PATCH_PRIMARY}>
              Concluir estudo
            </HoverButton>
          ) : !timer.running ? (
            <HoverButton
              onClick={() => setTimer((t) => (t.focusedSecs === 0 && t.phase === "focus" ? start(t) : resume(t)))}
              base={primaryBtn}
              hoverPatch={PATCH_PRIMARY}
            >
              {timer.focusedSecs === 0 && timer.phase === "focus" ? "Começar foco" : "Retomar"}
            </HoverButton>
          ) : (
            <HoverButton onClick={() => setTimer((t) => pause(t))} base={secondaryBtn} hoverPatch={PATCH_SECONDARY}>
              Pausar
            </HoverButton>
          )}
          {!done && (
            <HoverButton onClick={requestExit} base={secondaryBtn} hoverPatch={PATCH_SECONDARY}>
              Sair
            </HoverButton>
          )}
        </div>
      </div>

      {/* Exit-early confirmation (TECH-02.5) */}
      {confirmExit && (
        <div
          role="alertdialog"
          aria-label="Sair antes da hora?"
          style={{
            position: "absolute",
            inset: 0,
            background: "oklch(0.15 0.03 300 / 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 70,
            padding: 24,
          }}
          onClick={() => setConfirmExit(false)}
        >
          <EscapeCloser onClose={() => setConfirmExit(false)} />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(420px, 100%)",
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
              <span style={{ font: "600 18px/1.25 var(--font-sans)" }}>Sair antes da hora?</span>
              <span style={{ font: "400 13px/1.55 var(--font-sans)", color: "var(--text-2)" }}>
                Você ainda está no foco. Quer marcar este estudo como concluído mesmo assim, ou sair
                sem contar a sessão?
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <HoverButton
                onClick={() => {
                  setConfirmExit(false);
                  onComplete(timer.focusedSecs);
                }}
                base={{ ...primaryBtn, padding: 11, textAlign: "center" }}
                hoverPatch={PATCH_PRIMARY}
              >
                Marcar como concluído
              </HoverButton>
              <HoverButton
                onClick={() => {
                  setConfirmExit(false);
                  onExit();
                }}
                base={{ ...secondaryBtn, padding: 11, textAlign: "center" }}
                hoverPatch={PATCH_SECONDARY}
              >
                Sair sem concluir
              </HoverButton>
              <HoverButton
                onClick={() => setConfirmExit(false)}
                base={{
                  padding: 9,
                  borderRadius: 11,
                  border: "none",
                  background: "transparent",
                  color: "var(--text-2)",
                  font: "600 12.5px/1 var(--font-sans)",
                  cursor: "pointer",
                }}
                hoverPatch={PATCH_EXIT}
              >
                Continuar estudando
              </HoverButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "15px 34px",
  borderRadius: 15,
  border: "none",
  cursor: "pointer",
  background: "var(--accent)",
  color: "var(--accent-ink)",
  font: "600 15px/1 var(--font-sans)",
  boxShadow: "var(--shadow-accent)",
};

const secondaryBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "15px 26px",
  borderRadius: 15,
  border: "1px solid var(--border)",
  cursor: "pointer",
  background: "var(--surface-2)",
  color: "var(--text)",
  font: "600 15px/1 var(--font-sans)",
};

const exitBtn: React.CSSProperties = {
  padding: "8px 13px",
  borderRadius: 11,
  border: "none",
  background: "transparent",
  color: "var(--text-3)",
  font: "500 12px/1 var(--font-sans)",
  cursor: "pointer",
};

/** A button with a base style plus a hover patch (the timer controls all share this). */
function HoverButton({
  onClick,
  base,
  hoverPatch,
  children,
}: {
  onClick?: () => void;
  base: React.CSSProperties;
  hoverPatch: React.CSSProperties;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...base, ...(hover ? hoverPatch : null), transition: "background var(--transition-fast), color var(--transition-fast)" }}
    >
      {children}
    </button>
  );
}

const PATCH_PRIMARY: React.CSSProperties = { background: "var(--accent-hover)" };
const PATCH_SECONDARY: React.CSSProperties = { background: "var(--surface-3)" };
const PATCH_EXIT: React.CSSProperties = { background: "var(--surface-2)", color: "var(--text)" };
