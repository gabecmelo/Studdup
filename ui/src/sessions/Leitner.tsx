// Leitner session (TECH-08.2/3/4, handoff "SessaoLeitner"). Box-based flashcard review: the screen
// loads the card's *due* items (useDueLeitnerItems — only items whose box interval has come due), then
// walks them one at a time. For each item it shows the front, reveals the back on demand, and offers
// Certo / Errado — which call review_leitner_item (correct promotes one box, wrong resets to box 1,
// AD-012) and advance to the next item. When the queue empties it shows a calm done state whose
// "Concluir estudo" completes the card (advancing its board schedule). A Leitner card with nothing due
// lands directly on that state rather than erroring. Presentational: the parent owns the card-complete
// mutation via onComplete; item reviews are issued here through useReviewLeitnerItem.

import { useEffect, useState } from "react";
import type { LeitnerItem } from "../lib/bindings";
import { useDueLeitnerItems, useReviewLeitnerItem } from "../lib/queries";
import { useEscapeToClose } from "../lib/useEscapeToClose";
import { TECHNIQUE_LABEL, TechniqueIcon } from "../components/TechniqueChip";
import { SessionExitButton, SessionPrimaryButton } from "./sessionButtons";
import { TechniqueReminder } from "./TechniqueReminder";

export interface LeitnerSessionProps {
  cardId: number;
  cardTitle: string;
  /** Complete the card's study session (advances its board schedule). */
  onComplete: () => void;
  onExit: () => void;
}

export function LeitnerSession({ cardId, cardTitle, onComplete, onExit }: LeitnerSessionProps) {
  useEscapeToClose(onExit);

  const due = useDueLeitnerItems(cardId);
  const review = useReviewLeitnerItem();

  // Snapshot the due queue once, so reviewing (which invalidates the due query) does not reshuffle
  // the items mid-session. The queue is frozen at the first successful load.
  const [queue, setQueue] = useState<LeitnerItem[] | null>(null);
  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  useEffect(() => {
    if (queue === null && due.data) setQueue(due.data);
  }, [due.data, queue]);

  const loading = queue === null;
  const current = queue?.[pos];
  const total = queue?.length ?? 0;
  const doneAll = !loading && (total === 0 || pos >= total);

  function answer(correct: boolean) {
    if (!current) return;
    review.mutate({ cardId, itemId: current.id, correct });
    if (correct) setCorrectCount((n) => n + 1);
    setRevealed(false);
    setPos((p) => p + 1);
  }

  return (
    <div style={shell}>
      {/* Top bar */}
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 14, padding: "22px 30px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          <span style={iconBadge}>
            <TechniqueIcon technique="Leitner" size={14} />
          </span>
          <span style={{ font: "600 14px/1.2 var(--font-sans)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {cardTitle}
          </span>
        </div>
        <span style={chip}>{TECHNIQUE_LABEL.Leitner}</span>
        {!loading && !doneAll && (
          <span style={{ font: "500 12px/1 var(--font-mono, var(--font-sans))", color: "var(--text-3)" }}>
            {pos + 1} de {total}
          </span>
        )}
        <span style={{ flex: 1 }} />
        <SessionExitButton onClick={onExit} />
      </div>

      <TechniqueReminder technique="Leitner" />

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26, padding: 30 }}>
        {loading ? (
          <span style={{ font: "400 14px/1.5 var(--font-sans)", color: "var(--text-2)" }}>Carregando itens…</span>
        ) : doneAll ? (
          <DoneState reviewed={total} correct={correctCount} onComplete={onComplete} onExit={onExit} />
        ) : (
          current && (
            <>
              <span style={{ font: "600 10.5px/1 var(--font-sans)", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text-3)" }}>
                Caixa {current.box_no} · {revealed ? "verso" : "frente"}
              </span>

              {/* Flashcard */}
              <div
                style={{
                  width: "100%",
                  maxWidth: 520,
                  minHeight: 200,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 16,
                  padding: 34,
                  textAlign: "center",
                  borderRadius: 20,
                  background: "var(--surface)",
                  border: `1.5px solid ${revealed ? "var(--accent)" : "var(--border)"}`,
                  boxShadow: "var(--shadow-1)",
                }}
              >
                <span style={{ font: "600 24px/1.3 var(--font-sans)", letterSpacing: "-.02em", color: "var(--text)" }}>
                  {current.front}
                </span>
                {revealed && (
                  <>
                    <span style={{ width: "60%", height: 1, background: "var(--border)" }} />
                    <span style={{ font: "400 18px/1.5 var(--font-sans)", color: "var(--text-2)", whiteSpace: "pre-wrap" }}>
                      {current.back}
                    </span>
                  </>
                )}
              </div>

              {revealed ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <AnswerButton variant="wrong" onClick={() => answer(false)}>
                    Errei
                  </AnswerButton>
                  <AnswerButton variant="right" onClick={() => answer(true)}>
                    Acertei
                  </AnswerButton>
                </div>
              ) : (
                <SessionPrimaryButton onClick={() => setRevealed(true)}>Mostrar resposta</SessionPrimaryButton>
              )}

              <span style={{ font: "400 11.5px/1.4 var(--font-sans)", color: "var(--text-3)", maxWidth: 380, textAlign: "center" }}>
                {revealed
                  ? "Seja honesto — errar traz o item de volta amanhã; acertar o leva pra próxima caixa."
                  : "Responda de memória, depois mostre a resposta pra conferir."}
              </span>
            </>
          )
        )}
      </div>
    </div>
  );
}

function DoneState({
  reviewed,
  correct,
  onComplete,
  onExit,
}: {
  reviewed: number;
  correct: number;
  onComplete: () => void;
  onExit: () => void;
}) {
  const nothingDue = reviewed === 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, maxWidth: 480, textAlign: "center" }}>
      <span aria-hidden style={{ width: 11, height: 11, borderRadius: 999, background: "var(--accent)" }} />
      <h2 style={{ margin: 0, font: "600 28px/1.2 var(--font-sans)", letterSpacing: "-.025em" }}>
        {nothingDue ? "Nada pra revisar agora" : "Revisão concluída"}
      </h2>
      <span style={{ font: "400 14px/1.55 var(--font-sans)", color: "var(--text-2)" }}>
        {nothingDue
          ? "Nenhum item deste card está vencido hoje. Volte quando as caixas amadurecerem — ou adicione novos itens no detalhe do card."
          : `Você revisou ${reviewed} ${reviewed === 1 ? "item" : "itens"}, acertou ${correct}. Os itens já foram reagendados pela caixa de cada um.`}
      </span>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <SessionPrimaryButton onClick={onComplete}>Concluir estudo</SessionPrimaryButton>
        <button
          type="button"
          onClick={onExit}
          style={{ border: "none", background: "transparent", color: "var(--text-3)", font: "500 12px/1 var(--font-sans)", cursor: "pointer" }}
        >
          Sair sem concluir
        </button>
        <span style={{ font: "400 11.5px/1 var(--font-sans)", color: "var(--text-3)" }}>
          concluir agenda a próxima sessão deste card
        </span>
      </div>
    </div>
  );
}

function AnswerButton({
  variant,
  onClick,
  children,
}: {
  variant: "right" | "wrong";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const right = variant === "right";
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "13px 30px",
        borderRadius: 14,
        border: `1.5px solid ${right ? "var(--accent)" : "var(--danger, var(--atraso-ink))"}`,
        background: hover
          ? right
            ? "var(--accent-soft)"
            : "var(--atraso-soft)"
          : "var(--surface)",
        color: right ? "var(--accent-soft-ink)" : "var(--atraso-ink)",
        font: "600 14px/1 var(--font-sans)",
        cursor: "pointer",
        transition: "background var(--transition-fast)",
      }}
    >
      {children}
    </button>
  );
}

const shell: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 60,
  display: "flex",
  flexDirection: "column",
  background: "var(--bg)",
  color: "var(--text)",
};

const iconBadge: React.CSSProperties = {
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

const chip: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 999,
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  font: "500 11px/1.4 var(--font-sans)",
  color: "var(--text-2)",
  whiteSpace: "nowrap",
  flex: "none",
};
