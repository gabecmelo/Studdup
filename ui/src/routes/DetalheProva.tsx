// Exam detail (EXAM-01.6 / EXAM-04 — handoff "DetalheProva"). Shows one exam's name, target date,
// whole days remaining and the completed-vs-total session progress across all its cards, plus the
// list of its cards ("tópicos"). "Excluir" opens the delete confirmation. Presentational — the exam
// projection, its cards and the actions are passed in by the Prova board hub.

import type { Card as CardModel, ExamView, ISODate } from "../lib/bindings";
import { daysBetween } from "../components/columns";
import { TECHNIQUE_LABEL } from "../components/TechniqueChip";

export interface DetalheProvaProps {
  exam: ExamView;
  cards: CardModel[];
  today: ISODate;
  onBack?: () => void;
  onDelete?: () => void;
}

export function DetalheProva({ exam, cards, today, onBack, onDelete }: DetalheProvaProps) {
  const daysLeft = daysBetween(today, exam.exam_date);
  const ended = exam.concluded || daysLeft < 0;
  const pct = exam.total_sessions > 0 ? Math.round((exam.completed_sessions / exam.total_sessions) * 100) : 0;
  const accent = ended ? "var(--text-3)" : daysLeft <= 3 ? "var(--atraso-ink)" : "var(--accent)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, height: "100%", minHeight: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{ alignSelf: "flex-start", border: "none", background: "transparent", color: "var(--text-2)", font: "500 12.5px/1 var(--font-sans)", cursor: "pointer", padding: 0 }}
          >
            ‹ Todas as provas
          </button>
        )}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, minWidth: 0 }}>
            <span aria-hidden style={{ width: 13, height: 13, borderRadius: 999, background: accent, marginTop: 8, flex: "none" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ font: "600 26px/1.1 var(--font-sans)", letterSpacing: "-.025em", color: "var(--text)" }}>
                  {exam.name}
                </span>
                <span
                  style={{
                    padding: "5px 11px",
                    borderRadius: "var(--radius-pill)",
                    background: ended ? "var(--surface-3)" : "var(--accent-soft)",
                    color: ended ? "var(--text-2)" : "var(--accent-soft-ink)",
                    font: "600 11.5px/1.3 var(--font-sans)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ended ? "Encerrada" : `${daysLeft} ${daysLeft === 1 ? "dia" : "dias"} restantes`}
                </span>
              </div>
              <span style={{ font: "400 13px/1 var(--font-mono, var(--font-sans))", color: "var(--text-2)" }}>
                {exam.exam_date}
              </span>
            </div>
          </div>
          <button type="button" onClick={onDelete} style={deleteBtn}>
            Excluir
          </button>
        </div>

        {/* Progress + stats */}
        <div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7, minWidth: 240, maxWidth: 520 }}>
            <div style={{ height: 8, borderRadius: 5, background: "var(--surface-3)", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: 8, borderRadius: 5, background: accent }} />
            </div>
            <span style={{ font: "500 12px/1 var(--font-mono, var(--font-sans))", color: "var(--text-2)" }}>
              {exam.completed_sessions} de {exam.total_sessions} sessões concluídas
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
            <Stat value={String(cards.length)} label="tópicos" />
            <Divider />
            <Stat value={ended ? "—" : String(daysLeft)} label={ended ? "encerrada" : "dias restantes"} inkColor={accent} />
          </div>
        </div>
      </div>

      {/* Cards */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 11 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 2 }}>
          <span style={{ font: "600 15px/1 var(--font-sans)", color: "var(--text)" }}>Tópicos da prova</span>
          <span style={{ padding: "2px 8px", borderRadius: "var(--radius-pill)", background: "var(--surface-3)", color: "var(--text-2)", font: "600 11px/1.5 var(--font-mono, var(--font-sans))" }}>
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
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderLeft: `3px solid ${accent}`,
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-1)",
              }}
            >
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ font: "600 14px/1.3 var(--font-sans)", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {card.title}
                </span>
                {card.technique && (
                  <span style={{ font: "400 11.5px/1 var(--font-sans)", color: "var(--text-3)" }}>
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

const deleteBtn: React.CSSProperties = {
  padding: "10px 15px",
  borderRadius: "var(--radius-md)",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  color: "var(--text-3)",
  font: "600 13px/1 var(--font-sans)",
  cursor: "pointer",
};
