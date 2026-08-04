// Kanban board (KAN-01/02/03, AD-004): the four fixed columns — Hoje / Amanhã / Próximos /
// Concluídos — for both methods. Each card is placed by comparing its due date to today; overdue
// cards fall into "Hoje" with a badge; archived cards into "Concluídos". Empty columns keep their
// footprint with a visible placeholder rather than collapsing (KAN-01 §6).
//
// Placement reuses the pure `columns.ts` helpers (T19). Because `list_board` returns only the
// active `Card[]` (no materialized session dates), the board derives each card's due date from the
// spaced ladder anchor `start_date + stage offset` (AD-003).
//
// Drag (T23, dnd-kit): dropping Hoje→Amanhã reschedules (+1 day), dropping into Concluídos
// completes, a same-column drop is a no-op, and a drop outside any column reverts — all decided by
// the pure `resolveDrag` (lib/dnd.ts). The move shows optimistically and rolls back with a toast
// if the command fails. Exam-prep grouping and the exams rail are layered on in T24.

import { useEffect, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Card as CardModel, ISODate, Method, Stage } from "../lib/bindings";
import { useBoard, useCompleteCard, usePostponeCard } from "../lib/queries";
import {
  applyOptimisticMove,
  type OptimisticMoves,
  resolveDrag,
  rollbackMove,
} from "../lib/dnd";
import { filterBoardCards } from "../lib/boardFilter";
import { firstDueCard } from "../lib/dueCards";
import { useStore } from "../store";
import { Card } from "./Card";
import { SpacedStageBadge } from "./StageBadge";
import { EmptyState } from "./EmptyState";
import { Toast } from "./Toast";
import { useCardHub } from "./useCardHub";
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

/** Place a card given an already-resolved due date. Archived cards — and exam cards with no
 *  remaining session (a `null` due date) — land in "Concluídos" with no overdue count. This is the
 *  method-agnostic core: spaced cards feed it the ladder due date, exam cards their session cursor's
 *  due date (AD-014), so completing an exam session actually moves the card. */
export function placeAtDue(
  archived: boolean,
  dueDate: ISODate | null,
  today: ISODate,
): BoardPlacement {
  if (archived || dueDate === null) {
    return { column: "concluidos", dueDate: dueDate ?? today, overdueDays: 0 };
  }
  const column = columnForCard({ archived, dueDate }, today);
  const overdue = daysBetween(dueDate, today);
  return { column, dueDate, overdueDays: overdue > 0 ? overdue : 0 };
}

/** Resolve a *spaced* card's column, derived due date and overdue count (KAN-01 §1–2, AD-003).
 *  Exam cards are placed by their session cursor instead — see `placeAtDue`. */
export function placeCard(card: CardModel, today: ISODate): BoardPlacement {
  return placeAtDue(card.archived, spacedDueDate(card.start_date, card.current_stage), today);
}

/** Group the active cards into the four columns, honoring pending optimistic moves (KAN-02/03). */
function groupByColumn(
  cards: CardModel[],
  today: ISODate,
  moves: OptimisticMoves,
): Record<Column, CardModel[]> {
  const groups: Record<Column, CardModel[]> = {
    hoje: [],
    amanha: [],
    proximos: [],
    concluidos: [],
  };
  for (const card of cards) {
    const column = moves[card.id] ?? placeCard(card, today).column;
    groups[column].push(card);
  }
  return groups;
}

const EMPTY_COLUMN_TEXT: Record<Column, string> = {
  hoje: "Nada pra hoje — aproveite.",
  amanha: "Amanhã está livre por enquanto.",
  proximos: "Sem revisões agendadas ainda.",
  concluidos: "Sessões concluídas aparecem aqui.",
};

/** "9 ago" style short day label in pt-BR. */
function dayMon(iso: ISODate): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" })
    .format(new Date(y, m - 1, d))
    .replace(" de ", " ")
    .replace(".", "");
}

/** The context line: "Segunda, 9 de agosto · N cards no quadro" (handoff). */
function boardContext(count: number, today: ISODate): string {
  const [y, m, d] = today.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekdayLong = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(date);
  const weekday = weekdayLong.split("-")[0];
  const cap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const dm = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(date);
  const cards = count === 1 ? "1 card no quadro" : `${count} cards no quadro`;
  return count === 0 ? `${cap}, ${dm} · nenhum card ainda` : `${cap}, ${dm} · ${cards}`;
}

/** The small DM-Mono date shown at the right of each column header (handoff). */
function columnDate(column: Column, today: ISODate): string {
  switch (column) {
    case "hoje":
      return dayMon(today);
    case "amanha":
      return dayMon(addDaysIso(today, 1));
    case "proximos":
      return "próximos 30 dias";
    case "concluidos":
      return "recentes";
  }
}

export interface BoardProps {
  method: Method;
}

/** The four-column kanban board for the active method (METH-02, KAN-01/02/03). */
export function Board({ method }: BoardProps) {
  const today = todayIso();
  const query = useBoard(method);
  const boardSearch = useStore((s) => s.boardSearch);
  const boardTechnique = useStore((s) => s.boardTechnique);
  const cards = filterBoardCards(query.data ?? [], boardSearch, boardTechnique);

  // Cross-screen study intent from Início (HOME-04): when this board's method is the one
  // "Estudar agora" targeted, open the first due card's study flow — the same path as the detail
  // "Estudar" button (overdue → Recomeçar/Apagar, else the session). The intent is cleared as soon
  // as it is consumed so it fires exactly once and never on a later render.
  const pendingStudy = useStore((s) => s.pendingStudy);
  const clearStudy = useStore((s) => s.clearStudy);

  // Optimistic overrides (card id → column) held locally while a drag's command is in flight;
  // cleared on settle, rolled back on error. The Zustand store carries only durable prefs (T21),
  // so this transient board state stays in the component.
  const [moves, setMoves] = useState<OptimisticMoves>({});
  const [toast, setToast] = useState<string | null>(null);

  // The shared card interaction hub (detail → study/edit/postpone/log/delete + sessions). Clicking a
  // card calls `hub.open`; `hub.modals` renders the whole modal + session layer once.
  const hub = useCardHub(method);

  // Drag uses its own postpone/complete mutations (separate from the hub's) for the optimistic move.
  const postpone = usePostponeCard();
  const complete = useCompleteCard();

  const sensors = useSensors(
    // A small activation distance so a click to open a card is not read as a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const groups = groupByColumn(cards, today, moves);
  const contexto = boardContext(cards.length, today);

  // The board data used to resolve the intent is the unfiltered board (search/technique filters
  // must not hide the card Início asked to study). Wait until the query has resolved.
  const boardData = query.data;
  useEffect(() => {
    if (pendingStudy !== method || boardData === undefined) return;
    clearStudy(); // consume the intent immediately so it can't double-fire
    const card = firstDueCard(boardData, today);
    if (!card) return; // nothing due — never fabricate work (HOME-04/06)
    hub.study(card);
    // `today` is a stable per-day value; the effect keys on the intent + method + loaded data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingStudy, method, boardData]);

  function onDragEnd(event: DragEndEvent) {
    const cardId = Number(event.active.id);
    const from = event.active.data.current?.column as Column | undefined;
    const to = (event.over?.id as Column | undefined) ?? null;
    if (from === undefined) return;

    const resolution = resolveDrag(from, to);
    if (resolution.kind === "noop") return; // same-column or dropped outside → revert, no command

    // Show the move immediately, then reconcile with the command result.
    setMoves((m) => applyOptimisticMove(m, cardId, resolution.to));
    const settle = {
      onError: () => {
        setMoves((m) => rollbackMove(m, cardId));
        setToast("Não foi possível mover o card. Nada mudou.");
      },
      onSettled: () => setMoves((m) => rollbackMove(m, cardId)),
    };

    if (resolution.kind === "postpone") {
      postpone.mutate({ id: cardId, days: resolution.days }, settle);
    } else {
      complete.mutate(cardId, settle);
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      {/* Context line (handoff): "Segunda, 9 de agosto · N cards no quadro". */}
      <div style={{ flex: "none", padding: "0 22px 12px", font: "400 12.5px/1.3 var(--font-sans)", color: "var(--text-2)" }}>
        {contexto}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 12,
          alignItems: "stretch",
          padding: "0 22px 20px",
        }}
      >
        {COLUMN_ORDER.map((column) => (
          <BoardColumn
            key={column}
            column={column}
            method={method}
            cards={groups[column]}
            today={today}
            onOpen={hub.open}
          />
        ))}
      </div>

      {toast && (
        <div style={{ position: "fixed", left: 24, bottom: 24, zIndex: 50 }}>
          <Toast
            message={toast}
            variant="danger"
            actionLabel="Fechar"
            onAction={() => setToast(null)}
          />
        </div>
      )}

      {hub.modals}
    </DndContext>
  );
}

interface BoardColumnProps {
  column: Column;
  method: Method;
  cards: CardModel[];
  today: ISODate;
  onOpen: (card: CardModel) => void;
}

function BoardColumn({ column, method, cards, today, onOpen }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column });
  return (
    <section
      ref={setNodeRef}
      aria-label={COLUMN_LABELS[column]}
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: 0,
        borderRadius: 18,
        background: "var(--surface-2)",
        border: `1px solid ${isOver ? "var(--accent)" : "var(--border)"}`,
        overflow: "hidden",
        transition: "var(--transition-fast)",
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 9,
          padding: "0 10px 12px",
        }}
      >
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 5,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "13px 3px 10px",
            background: "var(--surface-2)",
          }}
        >
          <span style={{ font: "600 13.5px/1 var(--font-sans)", color: "var(--text)" }}>
            {COLUMN_LABELS[column]}
          </span>
          <span
            style={{
              font: "600 10.5px/1.6 var(--font-mono)",
              padding: "2px 7px",
              borderRadius: 999,
              background: "var(--surface-3)",
              color: "var(--text-2)",
            }}
          >
            {cards.length}
          </span>
          <span style={{ flex: 1 }} />
          <span style={{ font: "400 10.5px/1 var(--font-mono)", color: "var(--text-3)" }}>
            {columnDate(column, today)}
          </span>
        </header>

        {cards.length === 0 ? (
          <EmptyState title={EMPTY_COLUMN_TEXT[column]} />
        ) : (
          cards.map((card) => (
            <DraggableCard
              key={card.id}
              card={card}
              column={column}
              method={method}
              today={today}
              onOpen={onOpen}
            />
          ))
        )}
      </div>
    </section>
  );
}

interface DraggableCardProps {
  card: CardModel;
  column: Column;
  method: Method;
  today: ISODate;
  onOpen: (card: CardModel) => void;
}

function DraggableCard({ card, column, method, today, onOpen }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: { column },
  });
  const { overdueDays } = placeCard(card, today);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
        cursor: "grab",
        touchAction: "none",
      }}
    >
      <Card
        title={card.title}
        kind={card.current_stage === "Day0" ? "estudar" : "revisar"}
        badge={
          method === "SpacedRepetition" ? (
            <SpacedStageBadge stage={card.current_stage} />
          ) : undefined
        }
        technique={card.technique}
        estMinutes={card.est_minutes}
        focusedSecs={card.archived ? null : undefined}
        overdueDays={overdueDays}
        onClick={() => onOpen(card)}
      />
    </div>
  );
}
