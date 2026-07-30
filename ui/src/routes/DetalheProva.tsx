// Exam detail (EXAM-01.6 / EXAM-04 — handoff "DetalheProva"). One exam's name (in its colour),
// target date, status chip and completed-vs-total session progress in a surface-2 header band, over
// the list of its cards ("tópicos"). "Excluir" opens the delete confirmation. Presentational — the
// exam projection, its cards and the actions come from the Prova board hub.
//
// Data note: the handoff also shows a per-card session-dots row ("2/3") and a next-session label.
// Those come from ExamSession rows (seq / completed_at), which list_board does not return, so they
// are omitted here — a tracked data gap, not a style divergence.

import { useState } from "react";
import type { Card as CardModel, ExamView, ISODate } from "../lib/bindings";
import { daysBetween } from "../components/columns";
import { examColor } from "../components/examColor";
import { TECHNIQUE_LABEL, TechniqueIcon } from "../components/TechniqueChip";

export interface DetalheProvaProps {
  exam: ExamView;
  cards: CardModel[];
  today: ISODate;
  onBack?: () => void;
  onDelete?: () => void;
}

/** "8 de novembro" long date in pt-BR. */
function longDate(iso: ISODate): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(new Date(y, m - 1, d));
}

export function DetalheProva({ exam, cards, today, onBack, onDelete }: DetalheProvaProps) {
  const daysLeft = daysBetween(today, exam.exam_date);
  const ended = exam.concluded || daysLeft < 0;
  const pct = exam.total_sessions > 0 ? Math.round((exam.completed_sessions / exam.total_sessions) * 100) : 0;
  const thread = examColor(exam.id);
  const bar = ended ? "var(--revisar)" : thread;

  const dateLine = ended
    ? `Foi em ${longDate(exam.exam_date)} · encerrada`
    : `Prova em ${longDate(exam.exam_date)} · ${daysLeft === 0 ? "é hoje" : `faltam ${daysLeft} ${daysLeft === 1 ? "dia" : "dias"}`}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Header band (handoff: surface-2, border-bottom). */}
      <div
        style={{
          flex: "none",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          padding: "22px 34px",
          background: "var(--surface-2)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {onBack && <BackLink onClick={onBack} />}

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, minWidth: 0 }}>
            <span aria-hidden style={{ width: 13, height: 13, borderRadius: 999, background: thread, marginTop: 9, flex: "none" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ font: "600 28px/1.1 var(--font-sans)", letterSpacing: "-.025em", color: "var(--text)" }}>
                  {exam.name}
                </span>
                <span
                  style={{
                    padding: "5px 11px",
                    borderRadius: 999,
                    background: ended ? "var(--revisar-soft)" : "var(--accent-soft)",
                    color: ended ? "var(--revisar-ink)" : "var(--accent-soft-ink)",
                    font: "600 11.5px/1.3 var(--font-sans)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ended ? "✓ Encerrada" : "Em andamento"}
                </span>
              </div>
              <span style={{ font: "400 13px/1 var(--font-mono)", color: "var(--text-2)" }}>{dateLine}</span>
            </div>
          </div>
          {onDelete && <ExcluirButton onClick={onDelete} />}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7, minWidth: 240, maxWidth: 520 }}>
            <div style={{ height: 8, borderRadius: 5, background: "var(--surface-3)", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: 8, borderRadius: 5, background: bar }} />
            </div>
            <span style={{ font: "500 12px/1 var(--font-mono)", color: "var(--text-2)" }}>
              {exam.completed_sessions} de {exam.total_sessions} sessões concluídas
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
            <Stat value={String(cards.length)} label="tópicos" />
            <Divider />
            <Stat
              value={ended ? "—" : String(daysLeft)}
              label={ended ? "encerrada" : "dias restantes"}
              inkColor={ended ? "var(--text-2)" : "var(--text)"}
            />
          </div>
        </div>
      </div>

      {/* Cards ("tópicos"). */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 11, padding: "22px 34px 30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 4 }}>
          <span style={{ font: "600 15px/1 var(--font-sans)", color: "var(--text)" }}>Tópicos da prova</span>
          <span style={{ padding: "2px 8px", borderRadius: 999, background: "var(--surface-3)", color: "var(--text-2)", font: "600 11px/1.5 var(--font-mono)" }}>
            {cards.length}
          </span>
          <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
        </div>

        {cards.length === 0 ? (
          <span style={{ font: "400 13px/1.5 var(--font-sans)", color: "var(--text-2)", padding: "8px 2px" }}>
            Esta prova ainda não tem tópicos. Crie um card no método Prova e vincule a esta prova.
          </span>
        ) : (
          cards.map((card) => (
            <div
              key={card.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                padding: "16px 18px",
                background: card.archived ? "var(--surface-2)" : "var(--surface)",
                border: "1px solid var(--border)",
                borderLeft: `3px solid ${thread}`,
                borderRadius: 16,
                boxShadow: "var(--shadow-1)",
              }}
            >
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span
                    style={{
                      font: "600 14.5px/1.3 var(--font-sans)",
                      letterSpacing: "-.01em",
                      color: card.archived ? "var(--text-2)" : "var(--text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {card.title}
                  </span>
                  {card.archived && (
                    <span style={{ padding: "2px 8px", borderRadius: 999, background: "var(--revisar-soft)", color: "var(--revisar-ink)", font: "600 10px/1.4 var(--font-sans)", whiteSpace: "nowrap", flex: "none" }}>
                      concluído
                    </span>
                  )}
                </div>
                {card.technique && (
                  <span style={{ display: "flex", alignItems: "center", gap: 8, font: "500 11.5px/1 var(--font-sans)", color: "var(--text-2)" }}>
                    <TechniqueIcon technique={card.technique} size={13} />
                    {TECHNIQUE_LABEL[card.technique]}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        alignSelf: "flex-start",
        border: "none",
        background: "transparent",
        color: hover ? "var(--text)" : "var(--text-2)",
        font: "500 12.5px/1 var(--font-sans)",
        cursor: "pointer",
        padding: 0,
        transition: "color var(--transition-fast)",
      }}
    >
      ‹ Todas as provas
    </button>
  );
}

function ExcluirButton({ onClick }: { onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "10px 15px",
        borderRadius: 12,
        background: hover ? "var(--danger-soft)" : "var(--surface)",
        border: `1px solid ${hover ? "var(--danger-soft)" : "var(--border)"}`,
        color: hover ? "var(--danger-ink)" : "var(--text-3)",
        font: "600 13px/1 var(--font-sans)",
        cursor: "pointer",
        flex: "none",
        transition: "background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast)",
      }}
    >
      Excluir
    </button>
  );
}

function Stat({ value, label, inkColor }: { value: string; label: string; inkColor?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ font: "600 19px/1 var(--font-sans)", letterSpacing: "-.02em", color: inkColor ?? "var(--text)" }}>
        {value}
      </span>
      <span style={{ font: "400 11px/1 var(--font-sans)", color: "var(--text-3)" }}>{label}</span>
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 32, background: "var(--border)" }} />;
}
