// Active Recall session (TECH-04, handoff "SessaoActiveRecall"). Retrieval practice in three steps:
//   1. write — the content link is HIDDEN; the user writes what they remember from memory (TECH-04.1);
//   2. compare — only after they submit is the source material revealed, side by side with their
//      answer, so they can see what they got and what they missed;
//   3. rate — the three-point self-rating (TECH-06), whose value + written text the parent records
//      (record_session + record_attempt).
// Closing while there is written-but-unsubmitted text warns first (TECH-04.5), so a memory attempt is
// never silently discarded. Presentational: the parent owns the mutations via onFinish.

import { useRef, useState } from "react";
import { LinkRow } from "../components/LinkRow";
import { EscapeCloser, useEscapeToClose } from "../lib/useEscapeToClose";
import { TECHNIQUE_LABEL, TechniqueIcon } from "../components/TechniqueChip";
import { SelfRating } from "./SelfRatingControl";
import type { SelfRatingValue } from "./selfRating";
import { TechniqueReminder } from "./TechniqueReminder";

export interface ActiveRecallResult {
  focusedSecs: number;
  selfRating: SelfRatingValue;
  text: string;
}

export interface ActiveRecallSessionProps {
  cardTitle: string;
  contentLink?: string;
  reviewLink?: string;
  onFinish: (result: ActiveRecallResult) => void;
  onExit: () => void;
}

type Phase = "write" | "compare" | "rate";

export function ActiveRecallSession({
  cardTitle,
  contentLink,
  reviewLink,
  onFinish,
  onExit,
}: ActiveRecallSessionProps) {
  const [phase, setPhase] = useState<Phase>("write");
  const [text, setText] = useState("");
  const [confirmExit, setConfirmExit] = useState(false);
  const startedAt = useRef(Date.now());

  const hasText = text.trim().length > 0;
  const wordCount = text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;

  function requestExit() {
    // Unsaved memory attempt that was never compared → warn before discarding (TECH-04.5).
    if (phase === "write" && hasText) setConfirmExit(true);
    else onExit();
  }

  useEscapeToClose(requestExit);

  function elapsedSecs() {
    return Math.max(0, Math.round((Date.now() - startedAt.current) / 1000));
  }

  function finish(selfRating: SelfRatingValue) {
    onFinish({ focusedSecs: elapsedSecs(), selfRating, text: text.trim() });
  }

  return (
    <div style={shell}>
      {/* Top bar */}
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 14, padding: "22px 30px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          <span style={iconBadge}>
            <TechniqueIcon technique="ActiveRecall" size={14} />
          </span>
          <span style={{ font: "600 14px/1.2 var(--font-sans)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {cardTitle}
          </span>
        </div>
        <span style={chip}>{TECHNIQUE_LABEL.ActiveRecall}</span>
        <span style={{ flex: 1 }} />
        <ExitLink onClick={requestExit} />
      </div>

      <TechniqueReminder technique="ActiveRecall" />

      <div style={{ flex: 1, minHeight: 0, display: "flex", padding: "26px 30px 30px" }}>
        {phase === "write" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18, maxWidth: 820, margin: "0 auto", width: "100%", minHeight: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", textAlign: "center" }}>
              <span style={{ font: "600 23px/1.25 var(--font-sans)", letterSpacing: "-.02em" }}>
                O que você lembra sobre {cardTitle}?
              </span>
              <span style={{ font: "400 13.5px/1.5 var(--font-sans)", color: "var(--text-2)", maxWidth: 520 }}>
                Escreva de memória, sem consultar. O material está guardado — o esforço de lembrar é o
                que fixa.
              </span>
            </div>

            {/* Hidden-material notice (TECH-04.1): the content link is not shown yet. */}
            <div style={hiddenNotice}>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ font: "600 12px/1.2 var(--font-sans)" }}>Material escondido</span>
                <span style={{ font: "400 11.5px/1.3 var(--font-sans)", color: "var(--text-3)" }}>
                  Aparece pra comparação depois que você enviar
                </span>
              </div>
              <span style={lockPill}>🔒 oculto</span>
            </div>

            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", borderRadius: 16, border: `1.5px solid ${hasText ? "var(--accent)" : "var(--border)"}`, background: "var(--surface)", overflow: "hidden" }}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                autoFocus
                aria-label="Escreva o que lembra"
                placeholder="Comece a escrever o que vier à memória…"
                style={{
                  flex: 1,
                  minHeight: 0,
                  resize: "none",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: "var(--text)",
                  padding: 20,
                  font: "400 15px/1.7 var(--font-sans)",
                }}
              />
              <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}>
                <span style={{ font: "400 11px/1 var(--font-mono, var(--font-sans))", color: "var(--text-3)" }}>
                  {wordCount} {wordCount === 1 ? "palavra" : "palavras"}
                </span>
                <span style={{ flex: 1 }} />
                <SubmitButton disabled={!hasText} onClick={() => setPhase("compare")}>
                  Revelar material e comparar
                </SubmitButton>
              </div>
            </div>
          </div>
        )}

        {phase === "compare" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ font: "600 20px/1.2 var(--font-sans)", letterSpacing: "-.02em" }}>
                Compare com o material
              </span>
              <span style={{ font: "400 13px/1.4 var(--font-sans)", color: "var(--text-2)" }}>
                O que você acertou, o que faltou. Sem cobrança — isto mede o que revisar.
              </span>
            </div>
            <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 16 }}>
              <ComparePane dot="var(--accent)" title="Sua resposta de memória">
                <div style={{ font: "400 14px/1.65 var(--font-sans)", color: "var(--text)", whiteSpace: "pre-wrap" }}>
                  {text.trim()}
                </div>
              </ComparePane>
              <ComparePane dot="var(--revisar)" title="Material original">
                {contentLink || reviewLink ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <span style={{ font: "400 13px/1.5 var(--font-sans)", color: "var(--text-2)" }}>
                      Abra a fonte e confira sua resposta contra ela.
                    </span>
                    {contentLink && <LinkRow label="Material de conteúdo" url={contentLink} />}
                    {reviewLink && <LinkRow label="Notas de revisão" url={reviewLink} />}
                  </div>
                ) : (
                  <span style={{ font: "400 13px/1.5 var(--font-sans)", color: "var(--text-3)" }}>
                    Este card não tem link de material. Confira pela sua própria fonte de estudo.
                  </span>
                )}
              </ComparePane>
            </div>
            <div style={{ flex: "none", display: "flex", justifyContent: "center" }}>
              <SubmitButton onClick={() => setPhase("rate")}>Avaliar minha lembrança</SubmitButton>
            </div>
          </div>
        )}

        {phase === "rate" && (
          <SelfRating
            title="Como foi essa lembrança?"
            subtitle="Seja honesto — o Studdup usa isso pra decidir quando trazer este card de volta. Não existe resposta errada."
            onSelect={finish}
          />
        )}
      </div>

      {confirmExit && (
        <UnsavedWarning
          title="Você escreveu mas não comparou"
          body="Sua tentativa de memória ainda não foi enviada. Se sair agora, ela não conta como revisão e o texto se perde."
          backLabel="Voltar e comparar"
          onBack={() => setConfirmExit(false)}
          onDiscard={() => {
            setConfirmExit(false);
            onExit();
          }}
        />
      )}
    </div>
  );
}

// ---- shared bits for the written sessions ----

export const shell: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 60,
  display: "flex",
  flexDirection: "column",
  background: "var(--bg)",
  color: "var(--text)",
};

export const iconBadge: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 8,
  background: "var(--accent-soft)",
  color: "var(--accent-soft-ink)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "none",
};

export const chip: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 999,
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  font: "500 11px/1.4 var(--font-sans)",
  color: "var(--text-2)",
  whiteSpace: "nowrap",
  flex: "none",
};

const hiddenNotice: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 11,
  padding: "12px 15px",
  borderRadius: 13,
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
};

const lockPill: React.CSSProperties = {
  padding: "5px 11px",
  borderRadius: 999,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  color: "var(--text-3)",
  font: "500 10.5px/1.3 var(--font-sans)",
  whiteSpace: "nowrap",
  flex: "none",
};

export function ExitLink({ onClick }: { onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "8px 13px",
        borderRadius: 11,
        border: "none",
        background: hover ? "var(--surface-2)" : "transparent",
        color: hover ? "var(--text)" : "var(--text-3)",
        font: "500 12px/1 var(--font-sans)",
        cursor: "pointer",
        flex: "none",
        transition: "background var(--transition-fast), color var(--transition-fast)",
      }}
    >
      Sair
    </button>
  );
}

export function SubmitButton({
  onClick,
  disabled = false,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "11px 22px",
        borderRadius: 12,
        border: "none",
        background: disabled ? "var(--surface-3)" : hover ? "var(--accent-hover)" : "var(--accent)",
        color: disabled ? "var(--text-3)" : "var(--accent-ink)",
        font: "600 13px/1 var(--font-sans)",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : "var(--shadow-accent)",
        transition: "background var(--transition-fast)",
      }}
    >
      {children}
    </button>
  );
}

export function ComparePane({ dot, title, children }: { dot: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", borderRadius: 16, border: "1px solid var(--border)", background: "var(--surface)", overflow: "hidden" }}>
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 8, padding: "13px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: dot }} />
        <span style={{ font: "600 12px/1 var(--font-sans)" }}>{title}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: 18, overflowY: "auto" }}>{children}</div>
    </div>
  );
}

export function UnsavedWarning({
  title,
  body,
  backLabel,
  onBack,
  onDiscard,
}: {
  title: string;
  body: string;
  backLabel: string;
  onBack: () => void;
  onDiscard: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-label={title}
      onClick={onBack}
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
    >
      <EscapeCloser onClose={onBack} />
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
        <div style={{ width: 44, height: 44, borderRadius: 13, background: "var(--atraso-soft)", color: "var(--atraso-ink)", display: "flex", alignItems: "center", justifyContent: "center", font: "700 20px/1 var(--font-sans)" }}>
          !
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <span style={{ font: "600 18px/1.25 var(--font-sans)", letterSpacing: "-.02em" }}>{title}</span>
          <span style={{ font: "400 13px/1.55 var(--font-sans)", color: "var(--text-2)" }}>{body}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <button
            type="button"
            onClick={onBack}
            style={{ textAlign: "center", padding: 11, borderRadius: 12, background: "var(--accent)", color: "var(--accent-ink)", font: "600 13px/1 var(--font-sans)", border: "none", cursor: "pointer", boxShadow: "var(--shadow-accent)" }}
          >
            {backLabel}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            style={{ textAlign: "center", padding: 11, borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--danger-ink)", font: "600 13px/1 var(--font-sans)", cursor: "pointer" }}
          >
            Sair e descartar
          </button>
        </div>
      </div>
    </div>
  );
}
