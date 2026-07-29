// Prova board (KAN-04, AD-004/005): the same four columns as the spaced board, but exam-prep cards
// are grouped under a labeled exam heading inside each column, with an exams rail on the left
// (name / days-left / progress; urgency < 3 days; concluded treatment — see ExamsRail).
//
// Data note: the command bridge currently exposes only `list_board` (active `Card[]`) — there is no
// `list_exams` / session-progress read yet, and a `Card` carries `exam_id` but no exam name/date.
// So grouping keys off `exam_id` (heading "Prova #<id>") and the rail is fed the per-exam card
// counts derivable from the board. Exam names, target dates and completed/total session progress
// arrive when the exams read command lands (T30-era); ExamsRail already renders them when present.

import type { Card as CardModel } from "../lib/bindings";
import { useBoard } from "../lib/queries";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { ExamsRail, type ExamRailItem } from "../components/ExamsRail";
import { placeCard, todayIso } from "../components/Board";
import { COLUMN_LABELS, COLUMN_ORDER, type Column } from "../components/columns";

/** Stable key for a card's exam grouping (`exam_id`, or a sentinel when somehow unset). */
function examKey(card: CardModel): number {
  return card.exam_id ?? -1;
}

function examHeading(key: number): string {
  return key < 0 ? "Sem prova" : `Prova #${key}`;
}

interface ExamGroup {
  key: number;
  name: string;
  cards: CardModel[];
}

/** Group a column's cards by exam, preserving first-seen exam order and card load order. */
function groupByExam(cards: CardModel[]): ExamGroup[] {
  const order: number[] = [];
  const byKey = new Map<number, CardModel[]>();
  for (const card of cards) {
    const key = examKey(card);
    if (!byKey.has(key)) {
      byKey.set(key, []);
      order.push(key);
    }
    byKey.get(key)!.push(card);
  }
  return order.map((key) => ({ key, name: examHeading(key), cards: byKey.get(key)! }));
}

/** Rail items derived from the board's exam cards (counts only — see the data note above). */
function railItems(cards: CardModel[]): ExamRailItem[] {
  const order: number[] = [];
  const counts = new Map<number, number>();
  for (const card of cards) {
    const key = examKey(card);
    if (key < 0) continue;
    if (!counts.has(key)) order.push(key);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return order.map((key) => ({
    id: key,
    name: examHeading(key),
    examDate: null,
    completed: 0,
    total: counts.get(key) ?? 0,
    concluded: false,
  }));
}

export function QuadroProva() {
  const today = todayIso();
  const query = useBoard("ExamPrep");
  const cards = query.data ?? [];

  const columns: Record<Column, CardModel[]> = {
    hoje: [],
    amanha: [],
    proximos: [],
    concluidos: [],
  };
  for (const card of cards) {
    columns[placeCard(card, today).column].push(card);
  }

  return (
    <div style={{ display: "flex", gap: 12, height: "100%", minHeight: 0, alignItems: "stretch" }}>
      <ExamsRail exams={railItems(cards)} today={today} />

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 12,
          alignItems: "start",
        }}
      >
        {COLUMN_ORDER.map((column) => (
          <ProvaColumn key={column} column={column} groups={groupByExam(columns[column])} today={today} />
        ))}
      </div>
    </div>
  );
}

interface ProvaColumnProps {
  column: Column;
  groups: ExamGroup[];
  today: string;
}

function ProvaColumn({ column, groups, today }: ProvaColumnProps) {
  const count = groups.reduce((n, g) => n + g.cards.length, 0);

  return (
    <section
      aria-label={COLUMN_LABELS[column]}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
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
          {count}
        </span>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 130 }}>
        {groups.length === 0 ? (
          <EmptyState title="Sem sessões aqui." />
        ) : (
          groups.map((group) => (
            <div key={group.key} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "0 3px" }}>
                <span
                  aria-hidden
                  style={{ width: 7, height: 7, borderRadius: "var(--radius-pill)", background: "var(--accent)", flex: "none" }}
                />
                <span
                  style={{
                    font: "600 11px/1.2 var(--font-sans)",
                    color: "var(--text-2)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {group.name}
                </span>
              </div>

              {group.cards.map((card) => {
                const { overdueDays } = placeCard(card, today);
                return (
                  <Card
                    key={card.id}
                    title={card.title}
                    technique={card.technique}
                    estMinutes={card.est_minutes}
                    focusedSecs={card.archived ? null : undefined}
                    overdueDays={overdueDays}
                  />
                );
              })}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
