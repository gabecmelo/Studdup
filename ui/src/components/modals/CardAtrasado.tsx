// Overdue resolution modal (METH-05 restart, HIST-05 — handoff "ModalCardAtrasado"). When the user
// returns to an overdue card and chooses to study it, the app offers two non-punitive paths (AD:
// non-punitive tone): "Recomeçar o estudo" keeps the current stage and makes the card due today
// (restart_card), or "Apagar o progresso" resets the ladder to Day 0 (erase_card). The copy is
// deliberately non-judgmental — "sem certo ou errado", "nada se perde" — and both consequences are
// spelled out. "Agora não" dismisses without changing anything.
//
// Presentational: restart/erase are callbacks the board wires to the mutations.

import { useState } from "react";

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

export interface CardAtrasadoModalProps {
  open?: boolean;
  cardTitle: string;
  /** The stage label the card currently sits at (e.g. "Dia 5"), shown as what Recomeçar keeps. */
  stageLabel: string;
  /** Whole days the card is overdue (drives the tone: fresh vs. "faz um tempo"). */
  overdueDays: number;
  onRestart?: () => void;
  onErase?: () => void;
  onClose?: () => void;
}

export function CardAtrasadoModal({
  open = true,
  cardTitle,
  stageLabel,
  overdueDays,
  onRestart,
  onErase,
  onClose,
}: CardAtrasadoModalProps) {
  if (!open) return null;

  const many = overdueDays > 1;
  const dayWord = overdueDays === 1 ? "dia" : "dias";
  const subtitle = many
    ? "Faz um tempo — e tudo bem. Vamos retomar do jeito mais leve pra você."
    : "Você parou aqui há pouco. Dá pra continuar sem perder o ritmo.";
  const restartText = many
    ? `Continua de onde parou, no ${stageLabel}. Como já faz tempo, pode custar um pouco mais lembrar — mas você não perde o caminho já feito.`
    : `Continua de onde parou, no ${stageLabel}. Passou pouco tempo, então a memória ainda está fresca.`;
  const eraseText = many
    ? "Zera e recomeça do Dia 0. Faz sentido se o conteúdo já ficou distante demais e você prefere reconstruir a base."
    : "Zera e recomeça do Dia 0. Útil se você quer refazer a base com calma, sem pressa nenhuma.";

  return (
    <div role="presentation" onClick={onClose} style={OVERLAY}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label="Que bom te ver de volta"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 100%)",
          display: "flex",
          flexDirection: "column",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "var(--shadow-2)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "26px 28px 4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <span
              aria-hidden
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                background: "var(--atraso-soft)",
                color: "var(--atraso-ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                font: "600 20px/1 var(--font-sans)",
                flex: "none",
              }}
            >
              ◷
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ font: "600 19px/1.2 var(--font-sans)", letterSpacing: "-.02em", color: "var(--text)" }}>
                Que bom te ver de volta
              </span>
              <span style={{ font: "400 12.5px/1.4 var(--font-sans)", color: "var(--text-2)" }}>{subtitle}</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 14px",
              borderRadius: "var(--radius-lg)",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
            }}
          >
            <span aria-hidden style={{ width: 9, height: 9, borderRadius: 999, background: "var(--accent)", flex: "none" }} />
            <span style={{ flex: 1, font: "600 13.5px/1.3 var(--font-sans)", color: "var(--text)" }}>{cardTitle}</span>
            <span
              style={{
                padding: "4px 10px",
                borderRadius: "var(--radius-pill)",
                background: "var(--atraso-soft)",
                color: "var(--atraso-ink)",
                font: "600 11px/1.3 var(--font-sans)",
                whiteSpace: "nowrap",
              }}
            >
              esperando há {overdueDays} {dayWord}
            </span>
          </div>
        </div>

        {/* Two paths */}
        <div style={{ display: "flex", gap: 12, padding: "16px 28px 6px" }}>
          <PathCard onClick={onRestart} baseStyle={{ background: "var(--accent-soft)", border: "1.5px solid var(--accent)" }}>
            <span style={{ font: "600 14.5px/1.2 var(--font-sans)", color: "var(--accent-soft-ink)" }}>
              Recomeçar o estudo
            </span>
            <span style={{ font: "400 12px/1.5 var(--font-sans)", color: "var(--accent-soft-ink)", opacity: 0.9 }}>
              {restartText}
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 2 }}>
              <Consequence ink="var(--accent-soft-ink)">Mantém o estágio {stageLabel}</Consequence>
              <Consequence ink="var(--accent-soft-ink)">Vence hoje · nada se perde</Consequence>
            </span>
          </PathCard>

          <PathCard onClick={onErase} baseStyle={{ background: "var(--bg)", border: "1.5px solid var(--border-strong)" }}>
            <span style={{ font: "600 14.5px/1.2 var(--font-sans)", color: "var(--text)" }}>Apagar o progresso</span>
            <span style={{ font: "400 12px/1.5 var(--font-sans)", color: "var(--text-2)" }}>{eraseText}</span>
            <span style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 2 }}>
              <Consequence ink="var(--text-2)">Volta ao Dia 0</Consequence>
              <Consequence ink="var(--text-2)">Recomeça a trilha inteira</Consequence>
            </span>
          </PathCard>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "14px 28px 22px" }}>
          <span style={{ font: "400 11px/1.4 var(--font-sans)", color: "var(--text-3)", maxWidth: 300 }}>
            Sem certo ou errado — os dois caminhos são normais. Você decide o que faz sentido hoje.
          </span>
          <AgoraNaoButton onClick={onClose} />
        </div>
      </div>
    </div>
  );
}

/** One of the two overdue paths — a large choice card that lifts (shadow) on hover. */
function PathCard({
  onClick,
  baseStyle,
  children,
}: {
  onClick?: () => void;
  baseStyle: React.CSSProperties;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...optionCard,
        ...baseStyle,
        boxShadow: hover ? "var(--shadow-2)" : "none",
        transition: "box-shadow var(--transition-fast)",
      }}
    >
      {children}
    </button>
  );
}

function AgoraNaoButton({ onClick }: { onClick?: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "10px 18px",
        borderRadius: "var(--radius-md)",
        border: "none",
        background: hover ? "var(--surface-2)" : "transparent",
        color: hover ? "var(--text)" : "var(--text-2)",
        font: "600 12.5px/1 var(--font-sans)",
        cursor: "pointer",
        transition: "background var(--transition-fast), color var(--transition-fast)",
      }}
    >
      Agora não
    </button>
  );
}

function Consequence({ children, ink }: { children: React.ReactNode; ink: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 7, font: "500 11px/1.3 var(--font-sans)", color: ink }}>
      <span aria-hidden style={{ width: 5, height: 5, borderRadius: 999, background: "currentColor", flex: "none" }} />
      {children}
    </span>
  );
}

const optionCard: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: 18,
  borderRadius: "var(--radius-xl)",
  cursor: "pointer",
  textAlign: "left",
};
