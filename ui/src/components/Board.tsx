// Kanban board (KAN-01, AD-004/AD-016): the four fixed columns — Hoje / Amanhã / Próximos /
// Concluídos — for both methods. Each card is placed by comparing its due date to today; overdue
// cards fall into "Hoje" with a badge; archived cards into "Concluídos". Empty columns keep their
// footprint with a visible placeholder rather than collapsing (KAN-01 §6).
//
// The board is read-and-open only (AD-016): a card is opened by clicking it; there is no drag. A
// card's due date changes only by studying it (completing a session) or the explicit Adiar action —
// never by free manipulation, which would let a card advance or complete without any studying.
//
// Placement reuses the pure `columns.ts` helpers. Because `list_board` returns only the active
// `Card[]` (no materialized session dates), the board derives each card's due date from the spaced
// ladder anchor `start_date + stage offset` (AD-003).

import { useEffect } from "react";
import type { Card as CardModel, ISODate, Method, Stage } from "../lib/bindings";
import { useViewport, type Viewport } from "../lib/useViewport";
import { useBoard } from "../lib/queries";
import { filterBoardCards } from "../lib/boardFilter";
import { firstDueCard } from "../lib/dueCards";
import { useStore } from "../store";
import { Card } from "./Card";
import { SpacedStageBadge } from "./StageBadge";
import { EmptyState } from "./EmptyState";
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

/** Group the active cards into the four columns by their placement (KAN-01). */
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

/** The board container's `grid-template-columns` for a viewport (RWD-02, RWD-03): desktop keeps the
 *  four-wide grid, tablet halves it to two columns, phone collapses to a single stacked column. Pure
 *  so the responsive reflow is unit-testable without a browser. */
export function boardGridColumns(viewport: Viewport): string {
  switch (viewport) {
    case "phone":
      return "minmax(0, 1fr)";
    case "tablet":
      return "repeat(2, minmax(0, 1fr))";
    case "desktop":
      return "repeat(4, minmax(0, 1fr))";
  }
}

export interface BoardProps {
  method: Method;
}

/** The four-column kanban board for the active method (METH-02, KAN-01). */
export function Board({ method }: BoardProps) {
  const today = todayIso();
  const viewport = useViewport();
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

  // The shared card interaction hub (detail → study/edit/postpone/log/delete + sessions). Clicking a
  // card calls `hub.open`; `hub.modals` renders the whole modal + session layer once.
  const hub = useCardHub(method);

  const groups = groupByColumn(cards, today);
  const contexto = boardContext(cards.length, today);
  const isPhone = viewport === "phone";
  const gutter = isPhone ? 16 : 22;

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

  return (
    <>
      {/* Context line (handoff): "Segunda, 9 de agosto · N cards no quadro". */}
      <div style={{ flex: "none", padding: `0 ${gutter}px 12px`, font: "400 12.5px/1.3 var(--font-sans)", color: "var(--text-2)" }}>
        {contexto}
      </div>

      <div
        style={{
          // Phone stacks the four sections and the SHELL's section scrolls the whole page (RWD-02),
          // so the grid sizes to its content — a nested scroller here would trap the board in a
          // squeezed viewport and clip the last column. Tablet/desktop keep the fixed-height grid
          // whose columns scroll internally.
          flex: isPhone ? "none" : 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: boardGridColumns(viewport),
          gap: isPhone ? 14 : 12,
          alignItems: "stretch",
          overflowY: isPhone ? "visible" : undefined,
          padding: `0 ${gutter}px ${isPhone ? 24 : 20}px`,
        }}
      >
        {COLUMN_ORDER.map((column) => (
          <BoardColumn
            key={column}
            column={column}
            method={method}
            cards={groups[column]}
            today={today}
            stacked={viewport === "phone"}
            onOpen={hub.open}
          />
        ))}
      </div>

      {hub.modals}
    </>
  );
}

interface BoardColumnProps {
  column: Column;
  method: Method;
  cards: CardModel[];
  today: ISODate;
  /** Phone: the column grows to its content and the board area page-scrolls, instead of scrolling
   *  internally within a fixed-height grid cell (RWD-02). */
  stacked?: boolean;
  onOpen: (card: CardModel) => void;
}

function BoardColumn({ column, method, cards, today, stacked = false, onOpen }: BoardColumnProps) {
  return (
    <section
      aria-label={COLUMN_LABELS[column]}
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        // Stacked columns size to their content (the page scrolls); non-stacked columns are height-
        // constrained to their grid cell so their inner list can scroll.
        minHeight: 0,
        borderRadius: 18,
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flex: stacked ? "none" : 1,
          minHeight: 0,
          // Drop the inner scroll on phone so the whole board page-scrolls (RWD-02); keep it on
          // tablet/desktop so each column scrolls within its fixed grid cell.
          overflowY: stacked ? "visible" : "auto",
          display: "flex",
          flexDirection: "column",
          gap: 9,
          padding: "0 10px 12px",
        }}
      >
        <header
          style={{
            // Only a scrolling column needs a pinned header; a stacked phone section has no inner
            // scroll, and `sticky` there just adds a stacking context for no gain.
            position: stacked ? "static" : "sticky",
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
          // Stacked (phone): the placeholder shrinks to a slim strip — four full-size empty boxes
          // would be four screens of nothing to scroll past.
          <EmptyState title={EMPTY_COLUMN_TEXT[column]} compact={stacked} />
        ) : (
          cards.map((card) => (
            <BoardCard
              key={card.id}
              card={card}
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

interface BoardCardProps {
  card: CardModel;
  method: Method;
  today: ISODate;
  onOpen: (card: CardModel) => void;
}

/** A board card: click to open its detail (no drag — AD-016). `Card` renders its own clickable
 *  surface, so this just supplies the method-specific badge and the overdue count. */
function BoardCard({ card, method, today, onOpen }: BoardCardProps) {
  const { overdueDays } = placeCard(card, today);
  return (
    <Card
      title={card.title}
      kind={card.current_stage === "Day0" ? "estudar" : "revisar"}
      badge={
        method === "SpacedRepetition" ? <SpacedStageBadge stage={card.current_stage} /> : undefined
      }
      technique={card.technique}
      estMinutes={card.est_minutes}
      focusedSecs={card.archived ? null : undefined}
      overdueDays={overdueDays}
      onClick={() => onOpen(card)}
    />
  );
}
