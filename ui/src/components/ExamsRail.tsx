// Exams rail (KAN-04, AD-005) — the "Trilha de provas" list shown beside the Prova board. Each
// exam shows its name, whole days left until the target date, and a progress bar of completed vs
// total sessions. Exams within 3 days are flagged as urgent ("Reta final"); an exam whose date has
// passed (or that is concluded) is shown as "Encerrada" with muted styling (EXAM-03 conclusion).
//
// Presentational + a pure `examRailViewModel` that derives days-left / urgency / progress / status
// from an exam item, so the rail is ready to render real data once a `list_exams` read lands.

import type { ISODate } from "../lib/bindings";
import { daysBetween } from "./columns";

/** Threshold (in days) at or below which an upcoming exam is flagged urgent (KAN-04 "urgency"). */
export const URGENCY_DAYS = 3;

/** Source data for one rail row. `examDate`/`total` may be unknown until the exams read exists. */
export interface ExamRailItem {
  id: number;
  name: string;
  examDate: ISODate | null;
  completed: number;
  total: number;
  concluded: boolean;
}

export interface ExamRailViewModel {
  id: number;
  name: string;
  /** Whole days until the exam (negative once past); null when the date is unknown. */
  daysLeft: number | null;
  urgent: boolean;
  ended: boolean;
  pct: number;
  completed: number;
  total: number;
  status: string;
  chip: string;
}

/** Derive the display model for one exam row relative to `today`. */
export function examRailViewModel(item: ExamRailItem, today: ISODate): ExamRailViewModel {
  const daysLeft = item.examDate ? daysBetween(today, item.examDate) : null;
  const ended = item.concluded || (daysLeft !== null && daysLeft < 0);
  const urgent = !ended && daysLeft !== null && daysLeft <= URGENCY_DAYS;
  const pct = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;

  let status: string;
  let chip: string;
  if (ended) {
    status = "Encerrada";
    chip = "encerrada";
  } else if (urgent) {
    status = "Reta final";
    chip = daysLeft !== null ? `${daysLeft}d` : "—";
  } else {
    status = "No ritmo";
    chip = daysLeft !== null ? `${daysLeft}d` : "—";
  }

  return {
    id: item.id,
    name: item.name,
    daysLeft,
    urgent,
    ended,
    pct,
    completed: item.completed,
    total: item.total,
    status,
    chip,
  };
}

export interface ExamsRailProps {
  exams: ExamRailItem[];
  today: ISODate;
}

export function ExamsRail({ exams, today }: ExamsRailProps) {
  const models = exams.map((e) => examRailViewModel(e, today));

  return (
    <aside
      aria-label="Trilha de provas"
      style={{
        width: 264,
        flex: "none",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 14,
        borderRadius: "var(--radius-xl)",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        alignSelf: "stretch",
        minHeight: 0,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          font: "600 10.5px/1 var(--font-sans)",
          letterSpacing: ".12em",
          textTransform: "uppercase",
          color: "var(--text-3)",
          padding: "2px 2px 4px",
        }}
      >
        Trilha de provas
      </div>

      {models.length === 0 ? (
        <div style={{ font: "400 12px/1.5 var(--font-sans)", color: "var(--text-2)", padding: "6px 2px" }}>
          Nenhuma prova ainda. Cadastre a data e o Studdup distribui as sessões até lá.
        </div>
      ) : (
        models.map((m) => <ExamRow key={m.id} model={m} />)
      )}
    </aside>
  );
}

function ExamRow({ model }: { model: ExamRailViewModel }) {
  const accent = model.ended ? "var(--text-3)" : model.urgent ? "var(--atraso-ink)" : "var(--accent)";
  const chipBg = model.urgent ? "var(--atraso-soft)" : "var(--surface-3)";
  const chipInk = model.urgent ? "var(--atraso-ink)" : model.ended ? "var(--text-3)" : "var(--text-2)";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 13,
        borderRadius: "var(--radius-lg)",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        opacity: model.ended ? 0.7 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
        <span
          aria-hidden
          style={{
            width: 9,
            height: 9,
            borderRadius: "var(--radius-pill)",
            background: accent,
            marginTop: 4,
            flex: "none",
          }}
        />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            font: "600 13px/1.3 var(--font-sans)",
            letterSpacing: "-.01em",
            color: "var(--text)",
          }}
        >
          {model.name}
        </div>
        <span
          style={{
            padding: "3px 8px",
            borderRadius: "var(--radius-pill)",
            background: chipBg,
            color: chipInk,
            font: "600 10px/1.3 var(--font-mono, var(--font-sans))",
            whiteSpace: "nowrap",
            flex: "none",
          }}
        >
          {model.chip}
        </span>
      </div>

      <div style={{ height: 6, borderRadius: 3, background: "var(--surface-3)", overflow: "hidden" }}>
        <div
          style={{
            width: `${model.pct}%`,
            height: 6,
            borderRadius: 3,
            background: accent,
            transition: "var(--transition)",
          }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ font: "400 11px/1 var(--font-mono, var(--font-sans))", color: "var(--text-3)" }}>
          {model.completed} de {model.total} sessões
        </span>
        <span
          style={{
            font: "400 11px/1 var(--font-sans)",
            color: model.urgent ? "var(--atraso-ink)" : "var(--text-3)",
          }}
        >
          {model.status}
        </span>
      </div>
    </div>
  );
}
