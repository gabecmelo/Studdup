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

import { useState } from "react";
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
import {
  useBoard,
  useCompleteCard,
  useDeleteCard,
  useEditCard,
  useEraseCard,
  useHistory,
  usePostponeCard,
  useRecordSession,
  useRestartCard,
} from "../lib/queries";
import {
  applyOptimisticMove,
  type OptimisticMoves,
  resolveDrag,
  rollbackMove,
} from "../lib/dnd";
import { Card } from "./Card";
import { SpacedStageBadge } from "./StageBadge";
import { EmptyState } from "./EmptyState";
import { Toast } from "./Toast";
import { DetalheCardModal } from "./modals/DetalheCard";
import { LogCardModal } from "./modals/LogCard";
import { EditarCardModal } from "./modals/EditarCard";
import { CardAtrasadoModal } from "./modals/CardAtrasado";
import { AdiarModal } from "./modals/Adiar";
import { ExcluirCardModal } from "./modals/ExcluirCard";
import { PomodoroSession } from "../sessions/Pomodoro";
import { NoneSession } from "../sessions/None";

/** Spaced ladder stage → its "Dia N" label (mirrors the badge vocabulary, AD-003). */
const STAGE_LABEL: Record<Stage, string> = {
  Day0: "Dia 0",
  Day1: "Dia 1",
  Day2: "Dia 2",
  Day5: "Dia 5",
  Day15: "Dia 15",
  Day30: "Dia 30",
  Done: "Concluído",
};
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

export interface BoardProps {
  method: Method;
}

/** The four-column kanban board for the active method (METH-02, KAN-01/02/03). */
export function Board({ method }: BoardProps) {
  const today = todayIso();
  const query = useBoard(method);
  const cards = query.data ?? [];

  // Optimistic overrides (card id → column) held locally while a drag's command is in flight;
  // cleared on settle, rolled back on error. The Zustand store carries only durable prefs (T21),
  // so this transient board state stays in the component.
  const [moves, setMoves] = useState<OptimisticMoves>({});
  const [toast, setToast] = useState<string | null>(null);

  // Modal hub: clicking a card opens its detail; the detail routes to the log and edit modals
  // (T26). The overdue / postpone / delete flows (T27–T29) mount from the same detail buttons.
  const [detailCard, setDetailCard] = useState<CardModel | null>(null);
  const [logCard, setLogCard] = useState<CardModel | null>(null);
  const [editCard, setEditCard] = useState<CardModel | null>(null);
  const [overdueCard, setOverdueCard] = useState<CardModel | null>(null);
  const [postponeCard, setPostponeCard] = useState<CardModel | null>(null);
  const [deleteCard, setDeleteCard] = useState<CardModel | null>(null);
  // The card currently in a study session (T32/T33). Dispatched to the Pomodoro or plain screen.
  const [sessionCard, setSessionCard] = useState<CardModel | null>(null);

  const postpone = usePostponeCard();
  const complete = useCompleteCard();
  const record = useRecordSession();
  const edit = useEditCard();
  const restart = useRestartCard();
  const erase = useEraseCard();
  const remove = useDeleteCard();
  // The card's event log for the "Ver log" modal (filtered from the method's history by card id).
  const history = useHistory(method);

  const sensors = useSensors(
    // A small activation distance so a click to open a card is not read as a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const groups = groupByColumn(cards, today, moves);

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
            onOpen={setDetailCard}
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

      {detailCard && (
        <DetalheCardModal
          card={detailCard}
          today={today}
          onClose={() => setDetailCard(null)}
          onStudy={() => {
            // An overdue card first goes through the non-punitive Recomeçar/Apagar choice (T27);
            // an on-time card opens its study session (T32 Pomodoro / T33 plain).
            if (placeCard(detailCard, today).overdueDays > 0) {
              setOverdueCard(detailCard);
            } else {
              setSessionCard(detailCard);
            }
            setDetailCard(null);
          }}
          onEdit={() => {
            setEditCard(detailCard);
            setDetailCard(null);
          }}
          onPostpone={() => {
            setPostponeCard(detailCard);
            setDetailCard(null);
          }}
          onViewLog={() => {
            setLogCard(detailCard);
            setDetailCard(null);
          }}
          onDelete={() => {
            setDeleteCard(detailCard);
            setDetailCard(null);
          }}
        />
      )}

      {logCard && (
        <LogCardModal
          cardTitle={logCard.title}
          events={(history.data ?? []).filter((e) => e.card_id === logCard.id)}
          onClose={() => setLogCard(null)}
        />
      )}

      {editCard && (
        <EditarCardModal
          card={editCard}
          onClose={() => setEditCard(null)}
          onSave={(updated) => {
            edit.mutate(updated);
            setEditCard(null);
          }}
        />
      )}

      {overdueCard && (
        <CardAtrasadoModal
          cardTitle={overdueCard.title}
          stageLabel={STAGE_LABEL[overdueCard.current_stage]}
          overdueDays={placeCard(overdueCard, today).overdueDays}
          onRestart={() => {
            restart.mutate(overdueCard.id);
            setOverdueCard(null);
          }}
          onErase={() => {
            erase.mutate(overdueCard.id);
            setOverdueCard(null);
          }}
          onClose={() => setOverdueCard(null)}
        />
      )}

      {postponeCard && (
        <AdiarModal
          cardTitle={postponeCard.title}
          stage={postponeCard.current_stage}
          technique={postponeCard.technique}
          dueDate={placeCard(postponeCard, today).dueDate}
          onPostpone={(days) => {
            postpone.mutate({ id: postponeCard.id, days });
            setPostponeCard(null);
          }}
          onComplete={() => {
            complete.mutate(postponeCard.id);
            setPostponeCard(null);
          }}
          onClose={() => setPostponeCard(null)}
        />
      )}

      {deleteCard && (
        <ExcluirCardModal
          cardTitle={deleteCard.title}
          archived={deleteCard.archived}
          onConfirm={() => {
            remove.mutate(deleteCard.id);
            setDeleteCard(null);
          }}
          onClose={() => setDeleteCard(null)}
        />
      )}

      {/* Study session (T32/T33): a Pomodoro card runs the guided timer and records its focused
          seconds; every other card (no technique, or a technique whose guided screen ships later)
          uses the plain session whose "Concluir" completes the card. */}
      {sessionCard &&
        (sessionCard.technique === "Pomodoro" && sessionCard.pomodoro ? (
          <PomodoroSession
            cardTitle={sessionCard.title}
            rhythm={sessionCard.pomodoro}
            contentLink={sessionCard.content_link || undefined}
            onComplete={(focusedSecs) => {
              record.mutate({ id: sessionCard.id, focusedSecs, selfRating: null });
              setSessionCard(null);
            }}
            onExit={() => setSessionCard(null)}
          />
        ) : (
          <NoneSession
            cardTitle={sessionCard.title}
            contentLink={sessionCard.content_link || undefined}
            reviewLink={sessionCard.review_link || undefined}
            onConcluir={() => {
              complete.mutate(sessionCard.id);
              setSessionCard(null);
            }}
            onExit={() => setSessionCard(null)}
          />
        ))}
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
        gap: 10,
        minWidth: 0,
        padding: 12,
        borderRadius: "var(--radius-xl)",
        background: "var(--surface-2)",
        border: `1px solid ${isOver ? "var(--accent)" : "var(--border)"}`,
        transition: "var(--transition-fast)",
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
