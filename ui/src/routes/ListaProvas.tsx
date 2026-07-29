// Exam list (EXAM-04 — handoff "ListaProvas"). A grid of progress cards, one per exam, each showing
// its name, target date, whole days remaining (or "Encerrada" once past/concluded) and a
// completed-vs-total session progress bar. A "Nova Prova" action opens the create modal; an empty
// state invites creating the first exam. Presentational — data (ExamView[]) and the actions are
// passed in by the Prova board hub.

import type { ExamView, ISODate } from "../lib/bindings";
import { EmptyState } from "../components/EmptyState";
import { daysBetween } from "../components/columns";

export interface ListaProvasProps {
  exams: ExamView[];
  today: ISODate;
  onNewExam?: () => void;
  onOpenExam?: (examId: number) => void;
  onBack?: () => void;
}

interface ProvaCardModel {
  id: number;
  name: string;
  targetDate: ISODate;
  daysLeft: number;
  ended: boolean;
  urgent: boolean;
  pct: number;
  completed: number;
  total: number;
}

function toModel(exam: ExamView, today: ISODate): ProvaCardModel {
  const daysLeft = daysBetween(today, exam.exam_date);
  const ended = exam.concluded || daysLeft < 0;
  return {
    id: exam.id,
    name: exam.name,
    targetDate: exam.exam_date,
    daysLeft,
    ended,
    urgent: !ended && daysLeft <= 3,
    pct: exam.total_sessions > 0 ? Math.round((exam.completed_sessions / exam.total_sessions) * 100) : 0,
    completed: exam.completed_sessions,
    total: exam.total_sessions,
  };
}

export function ListaProvas({ exams, today, onNewExam, onOpenExam, onBack }: ListaProvasProps) {
  const models = exams.map((e) => toModel(e, today));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{ alignSelf: "flex-start", border: "none", background: "transparent", color: "var(--text-2)", font: "500 12.5px/1 var(--font-sans)", cursor: "pointer", padding: 0 }}
            >
              ‹ Voltar ao quadro
            </button>
          )}
          <span style={{ font: "600 24px/1.1 var(--font-sans)", letterSpacing: "-.025em", color: "var(--text)" }}>
            Suas provas
          </span>
          <span style={{ font: "400 13.5px/1.3 var(--font-sans)", color: "var(--text-2)" }}>
            {models.length === 0
              ? "Cadastre uma prova e o Studdup distribui as sessões até a data."
              : `${models.length} ${models.length === 1 ? "prova cadastrada" : "provas cadastradas"}.`}
          </span>
        </div>
        <button type="button" onClick={onNewExam} style={newExamBtn}>
          ＋ Nova Prova
        </button>
      </div>

      {models.length === 0 ? (
        <EmptyState
          title="Nenhuma prova por aqui"
          description="Cada prova vira uma trilha de sessões distribuídas até a data. Cadastre a primeira e o Studdup monta o calendário pra você."
          actionLabel="Criar minha primeira prova"
          onAction={onNewExam}
        />
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 2 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
            {models.map((m) => (
              <ProvaCard key={m.id} model={m} onOpen={() => onOpenExam?.(m.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProvaCard({ model, onOpen }: { model: ProvaCardModel; onOpen: () => void }) {
  const accent = model.ended ? "var(--text-3)" : model.urgent ? "var(--atraso-ink)" : "var(--accent)";
  const chipBg = model.urgent ? "var(--atraso-soft)" : model.ended ? "var(--surface-3)" : "var(--accent-soft)";
  const chipInk = model.urgent ? "var(--atraso-ink)" : model.ended ? "var(--text-2)" : "var(--accent-soft-ink)";

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 15,
        padding: 20,
        textAlign: "left",
        cursor: "pointer",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "var(--shadow-1)",
        opacity: model.ended ? 0.75 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span aria-hidden style={{ width: 11, height: 11, borderRadius: 999, background: accent, marginTop: 5, flex: "none" }} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ font: "600 16px/1.3 var(--font-sans)", letterSpacing: "-.01em", color: "var(--text)" }}>
            {model.name}
          </span>
          <span style={{ font: "400 12px/1 var(--font-mono, var(--font-sans))", color: "var(--text-3)" }}>
            {model.targetDate}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
          <span style={{ font: "600 28px/1 var(--font-sans)", letterSpacing: "-.03em", color: accent }}>
            {model.ended ? "—" : model.daysLeft}
          </span>
          {!model.ended && (
            <span style={{ font: "400 12px/1 var(--font-sans)", color: "var(--text-3)" }}>
              {model.daysLeft === 1 ? "dia" : "dias"}
            </span>
          )}
        </div>
        <span style={{ flex: 1 }} />
        <span style={{ padding: "5px 10px", borderRadius: "var(--radius-pill)", background: chipBg, color: chipInk, font: "600 10.5px/1.3 var(--font-sans)", whiteSpace: "nowrap" }}>
          {model.ended ? "Encerrada" : model.urgent ? "Reta final" : "No ritmo"}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ height: 7, borderRadius: 4, background: "var(--surface-3)", overflow: "hidden" }}>
          <div style={{ width: `${model.pct}%`, height: 7, borderRadius: 4, background: accent }} />
        </div>
        <span style={{ font: "500 11.5px/1 var(--font-mono, var(--font-sans))", color: "var(--text-2)" }}>
          {model.completed} de {model.total} sessões
        </span>
      </div>
    </button>
  );
}

const newExamBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  padding: "11px 17px",
  borderRadius: "var(--radius-md)",
  border: "none",
  background: "var(--accent)",
  color: "var(--accent-ink)",
  font: "600 13px/1 var(--font-sans)",
  cursor: "pointer",
  boxShadow: "var(--shadow-accent)",
};
