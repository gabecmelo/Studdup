// Exam list (EXAM-04 — handoff "ListaProvas"). A grid of progress cards, one per exam, each showing
// its name in the exam's colour, its target date, a status-driven highlight (days left / open
// sessions / ✓ concluded) and a completed-vs-total progress bar. An Ativas / Encerradas segmented
// filter splits upcoming from ended exams; "Nova Prova" opens the create modal; an empty state
// invites creating the first exam. Presentational — data (ExamView[]) and actions come from the
// Prova board hub.

import { useState } from "react";
import type { ExamView, ISODate } from "../lib/bindings";
import { EmptyState } from "../components/EmptyState";
import { PlusIcon } from "../components/brand";
import { examColor } from "../components/examColor";
import { daysBetween } from "../components/columns";

export interface ListaProvasProps {
  exams: ExamView[];
  today: ISODate;
  onNewExam?: () => void;
  onOpenExam?: (examId: number) => void;
  onBack?: () => void;
}

type ProvaStatus = "normal" | "urgente" | "vencida" | "concluida";

interface ProvaCardModel {
  id: number;
  name: string;
  targetDate: string;
  status: ProvaStatus;
  ended: boolean;
  daysLeft: number;
  openSessions: number;
  pct: number;
  completed: number;
  total: number;
}

/** "8 de novembro" long date in pt-BR. */
function longDate(iso: ISODate): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(new Date(y, m - 1, d));
}

function toModel(exam: ExamView, today: ISODate): ProvaCardModel {
  const daysLeft = daysBetween(today, exam.exam_date);
  const openSessions = Math.max(0, exam.total_sessions - exam.completed_sessions);
  let status: ProvaStatus;
  if (exam.concluded || (daysLeft < 0 && openSessions === 0)) status = "concluida";
  else if (daysLeft < 0) status = "vencida";
  else if (daysLeft <= 3) status = "urgente";
  else status = "normal";
  return {
    id: exam.id,
    name: exam.name,
    targetDate: longDate(exam.exam_date),
    status,
    ended: status === "concluida" || status === "vencida",
    daysLeft,
    openSessions,
    pct: exam.total_sessions > 0 ? Math.round((exam.completed_sessions / exam.total_sessions) * 100) : 0,
    completed: exam.completed_sessions,
    total: exam.total_sessions,
  };
}

export function ListaProvas({ exams, today, onNewExam, onOpenExam, onBack }: ListaProvasProps) {
  const models = exams.map((e) => toModel(e, today));
  const [filter, setFilter] = useState<"ativas" | "encerradas">("ativas");
  const activeCount = models.filter((m) => !m.ended).length;
  const endedCount = models.length - activeCount;
  const shown = models.filter((m) => (filter === "ativas" ? !m.ended : m.ended));

  const subtitle =
    models.length === 0
      ? "Comece cadastrando a data de uma prova."
      : `${activeCount} ${activeCount === 1 ? "prova ativa" : "provas ativas"} · ${endedCount} encerrada${endedCount === 1 ? "" : "s"}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, height: "100%", minHeight: 0, padding: "26px 34px 0" }}>
      <div style={{ flex: "none", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {onBack && <BackLink onClick={onBack} />}
          <span style={{ font: "600 26px/1.1 var(--font-sans)", letterSpacing: "-.025em", color: "var(--text)" }}>
            Suas provas
          </span>
          <span style={{ font: "400 13.5px/1.3 var(--font-sans)", color: "var(--text-2)" }}>{subtitle}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {models.length > 0 && (
            <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 11 }}>
              <FilterTab label="Ativas" active={filter === "ativas"} onClick={() => setFilter("ativas")} />
              <FilterTab label="Encerradas" active={filter === "encerradas"} onClick={() => setFilter("encerradas")} />
            </div>
          )}
          <NovaProvaButton onClick={onNewExam} />
        </div>
      </div>

      {models.length === 0 ? (
        <EmptyState
          title="Nenhuma prova por aqui"
          description="Cada prova vira uma trilha de sessões distribuídas até a data. Cadastre a primeira e o Studdup monta o calendário pra você."
          actionLabel="Criar minha primeira prova"
          onAction={onNewExam}
        />
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 2px 30px" }}>
          {shown.length === 0 ? (
            <div style={{ font: "400 13px/1.5 var(--font-sans)", color: "var(--text-2)", padding: "8px 2px" }}>
              {filter === "ativas" ? "Nenhuma prova ativa no momento." : "Nenhuma prova encerrada ainda."}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
              {shown.map((m) => (
                <ProvaCard key={m.id} model={m} onOpen={() => onOpenExam?.(m.id)} />
              ))}
            </div>
          )}
        </div>
      )}
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
      ‹ Voltar ao quadro
    </button>
  );
}

function FilterTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "7px 13px",
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        font: `${active ? 600 : 500} 12px/1 var(--font-sans)`,
        background: active ? "var(--surface)" : "transparent",
        color: active ? "var(--text)" : hover ? "var(--text)" : "var(--text-2)",
        boxShadow: active ? "var(--shadow-1)" : "none",
        transition: "color var(--transition-fast)",
      }}
    >
      {label}
    </button>
  );
}

function NovaProvaButton({ onClick }: { onClick?: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "11px 17px",
        borderRadius: 12,
        border: "none",
        background: hover ? "var(--accent-hover)" : "var(--accent)",
        color: "var(--accent-ink)",
        font: "600 13px/1 var(--font-sans)",
        cursor: "pointer",
        boxShadow: "var(--shadow-accent)",
        transition: "background var(--transition-fast)",
      }}
    >
      <PlusIcon size={15} />
      Nova Prova
    </button>
  );
}

function ProvaCard({ model, onOpen }: { model: ProvaCardModel; onOpen: () => void }) {
  const [hover, setHover] = useState(false);
  const dot = examColor(model.id);
  const bar = model.status === "concluida" ? "var(--revisar)" : dot;

  let highlight: string;
  let unit: string;
  let highlightInk: string;
  let chip: string;
  let chipBg: string;
  let chipInk: string;
  let note: string;
  let noteInk: string;
  if (model.status === "concluida") {
    highlight = "✓";
    unit = "";
    highlightInk = "var(--revisar-ink)";
    chip = "Concluída";
    chipBg = "var(--revisar-soft)";
    chipInk = "var(--revisar-ink)";
    note = "Todas as sessões feitas";
    noteInk = "var(--revisar-ink)";
  } else if (model.status === "vencida") {
    highlight = String(model.openSessions);
    unit = model.openSessions === 1 ? "sessão aberta" : "sessões abertas";
    highlightInk = "var(--atraso-ink)";
    chip = "Data passou";
    chipBg = "var(--atraso-soft)";
    chipInk = "var(--atraso-ink)";
    note = "Reagende ou encerre";
    noteInk = "var(--atraso-ink)";
  } else if (model.status === "urgente") {
    highlight = String(model.daysLeft);
    unit = model.daysLeft === 1 ? "dia restante" : "dias restantes";
    highlightInk = "var(--atraso-ink)";
    chip = "Reta final";
    chipBg = "var(--atraso-soft)";
    chipInk = "var(--atraso-ink)";
    note = "Foco nas próximas";
    noteInk = "var(--atraso-ink)";
  } else {
    highlight = String(model.daysLeft);
    unit = "dias restantes";
    highlightInk = "var(--text)";
    chip = "No ritmo";
    chipBg = "var(--surface-2)";
    chipInk = "var(--text-2)";
    note = "No prazo";
    noteInk = "var(--text-3)";
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 15,
        padding: 20,
        cursor: "pointer",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        boxShadow: hover ? "var(--shadow-2)" : "var(--shadow-1)",
        opacity: model.status === "concluida" ? 0.85 : 1,
        transition: "box-shadow var(--transition-fast)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span aria-hidden style={{ width: 11, height: 11, borderRadius: 999, background: dot, marginTop: 5, flex: "none" }} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ font: "600 16px/1.3 var(--font-sans)", letterSpacing: "-.01em", color: "var(--text)" }}>
            {model.name}
          </span>
          <span style={{ font: "400 12px/1 var(--font-mono)", color: "var(--text-3)" }}>{model.targetDate}</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5, minWidth: 0 }}>
          <span style={{ font: "600 28px/1 var(--font-sans)", letterSpacing: "-.03em", color: highlightInk, flex: "none" }}>
            {highlight}
          </span>
          {unit && (
            <span style={{ font: "400 12px/1.2 var(--font-sans)", color: "var(--text-3)" }}>{unit}</span>
          )}
        </div>
        <span style={{ flex: 1 }} />
        <span
          style={{
            padding: "5px 10px",
            borderRadius: 999,
            background: chipBg,
            color: chipInk,
            font: "600 10.5px/1.3 var(--font-sans)",
            whiteSpace: "nowrap",
            flex: "none",
          }}
        >
          {chip}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ height: 7, borderRadius: 4, background: "var(--surface-3)", overflow: "hidden" }}>
          <div style={{ width: `${model.pct}%`, height: 7, borderRadius: 4, background: bar }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ font: "500 11.5px/1 var(--font-mono)", color: "var(--text-2)" }}>
            {model.completed} de {model.total} sessões
          </span>
          <span style={{ font: "400 11.5px/1 var(--font-sans)", color: noteInk }}>{note}</span>
        </div>
      </div>
    </div>
  );
}
