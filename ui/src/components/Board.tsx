// Kanban board (KAN-01, AD-004): the four fixed columns — Hoje / Amanhã / Próximos / Concluídos —
// for both methods. Each card is placed by comparing its due date to today; overdue cards fall
// into "Hoje" with a badge; archived cards into "Concluídos". Empty columns keep their footprint
// with a visible placeholder rather than collapsing (KAN-01 §6).
//
// Placement reuses the pure `columns.ts` helpers (T19). Because `list_board` returns only the
// active `Card[]` (no materialized session dates), the board derives each card's due date from the
// spaced ladder anchor `start_date + stage offset` (AD-003). Exam-prep grouping and the exams rail
// are layered on in T24; drag-to-reschedule/complete is added in T23 (cards are static here).

import type { Card as CardModel, ISODate, Method, Stage } from "../lib/bindings";
import { useBoard } from "../lib/queries";
import { Card } from "./Card";
import { SpacedStageBadge } from "./StageBadge";
import { EmptyState } from "./EmptyState";
import {
  COLUMN_LABELS,
  COLUMN_ORDER,
  type Column,
  columnForCard,
  daysBetween,
} from "./columns";

/** Ladder stage → day offset from `start_date` (AD-003; the enum value *is* the offset). */
export const STAGE_OFFSET: Record<Stage, number> = {
  Day0: 0,
  Day1: 1,
  Day2: 2,
  Day5: 5,
  Day15: 15,
  Day30: 30,
  Done: -1,
};

/** Add whole calendar days to an ISO date (tz/DST-independent — dates are calendar-only). */
export function addDaysIso(iso: ISODate, days: number): ISODate {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** A spaced card's due date: `start_date + stage offset` (AD-003, no stored due date). */
export function spacedDueDate(startDate: ISODate, stage: Stage): ISODate {
  return addDaysIso(startDate, STAGE_OFFSET[stage]);
}

/** Today as a local-timezone ISO date (day boundary at local midnight, as the C++ app). */
export function todayIso(): ISODate {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface BoardPlacement {
  column: Column;
  dueDate: ISODate;
  /** Whole days overdue (0 when on time or archived). */
  overdueDays: number;
}

/** Resolve a card's column, derived due date and overdue count (KAN-01 §1–2). */
export function placeCard(card: CardModel, today: ISODate): BoardPlacement {
  const dueDate = spacedDueDate(card.start_date, card.current_stage);
  const column = columnForCard({ archived: card.archived, dueDate }, today);
  const overdue = daysBetween(dueDate, today);
  const overdueDays = !card.archived && overdue > 0 ? overdue : 0;
  return { column, dueDate, overdueDays };
}

/** Group the active cards into the four columns, preserving load order within each. */
function groupByColumn(cards: CardModel[], today: ISODate): Record<Column, CardModel[]> {
  const groups: Record<Column, CardModel[]> = {
    hoje: [],
    amanha: [],
    proximos: [],
    concluidos: [],
  };
  for (const card of cards) {
    groups[placeCard(card, today).column].push(card);
  }
  return groups;
}

const EMPTY_COLUMN_TEXT: Record<Column, string> = {
  hoje: "Nada pra hoje — aproveite.",
  amanha: "Amanhã está livre por enquanto.",
  proximos: "Sem revisões agendadas ainda.",
  concluidos: "Sessões concluídas aparecem aqui.",
};

export interface BoardProps {
  method: Method;
}

/** The four-column kanban board for the active method (METH-02, KAN-01). */
export function Board({ method }: BoardProps) {
  const today = todayIso();
  const query = useBoard(method);
  const cards = query.data ?? [];
  const groups = groupByColumn(cards, today);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 12,
        alignItems: "start",
        height: "100%",
        minHeight: 0,
      }}
    >
      {COLUMN_ORDER.map((column) => (
        <BoardColumn
          key={column}
          column={column}
          method={method}
          cards={groups[column]}
          today={today}
        />
      ))}
    </div>
  );
}

interface BoardColumnProps {
  column: Column;
  method: Method;
  cards: CardModel[];
  today: ISODate;
}

function BoardColumn({ column, method, cards, today }: BoardColumnProps) {
  return (
    <section
      aria-label={COLUMN_LABELS[column]}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minWidth: 0,
        padding: 12,
        borderRadius: "var(--radius-xl)",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 4px" }}>
        <span style={{ font: "600 13.5px/1 var(--font-sans)", color: "var(--text)" }}>
          {COLUMN_LABELS[column]}
        </span>
        <span
          style={{
            font: "600 11px/1.4 var(--font-mono, var(--font-sans))",
            padding: "2px 7px",
            borderRadius: "var(--radius-pill)",
            background: "var(--surface-3)",
            color: "var(--text-2)",
          }}
        >
          {cards.length}
        </span>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 130 }}>
        {cards.length === 0 ? (
          <EmptyState title={EMPTY_COLUMN_TEXT[column]} />
        ) : (
          cards.map((card) => {
            const { overdueDays } = placeCard(card, today);
            return (
              <Card
                key={card.id}
                title={card.title}
                badge={
                  method === "SpacedRepetition" ? (
                    <SpacedStageBadge stage={card.current_stage} />
                  ) : undefined
                }
                technique={card.technique}
                estMinutes={card.est_minutes}
                focusedSecs={card.archived ? null : undefined}
                overdueDays={overdueDays}
              />
            );
          })
        )}
      </div>
    </section>
  );
}
