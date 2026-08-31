// Prova board hub (KAN-04, EXAM-01/04, AD-004/005). The four-column board with exam-prep cards
// grouped under a labeled exam heading inside each column and the exams rail on the left. With the
// `list_exams` read now surfaced (T30), the headings and rail carry real exam names, target dates and
// completed/total session progress (closing the T24 data gap).
//
// This screen also hosts the exam-management flow: a "Gerenciar provas" action opens the exam list
// (ListaProvas); a list card opens the exam detail (DetalheProva); and Nova Prova / Excluir Prova are
// wired to `useCreateExam` / `useDeleteExam`. View state is local to the board hub (the shell nav set
// is fixed, AD-009, so exams are reached contextually from the Prova board rather than a top-level
// route).

import { useState } from "react";
import type { Card as CardModel, ExamView, ISODate, SessionCursor } from "../lib/bindings";
import { useBoard, useCreateExam, useDeleteExam, useExams, useSessionCursors } from "../lib/queries";
import { filterBoardCards } from "../lib/boardFilter";
import { useStore } from "../store";
import { EmptyState } from "../components/EmptyState";
import { ExamsRail, type ExamRailItem } from "../components/ExamsRail";
import { ProvaCard } from "../components/ProvaCard";
import { examColor } from "../components/examColor";
import { addDaysIso, boardGridColumns, placeAtDue, todayIso } from "../components/Board";
import { useViewport } from "../lib/useViewport";
import { COLUMN_LABELS, COLUMN_ORDER, type Column } from "../components/columns";
import { useCardHub } from "../components/useCardHub";
import { NovaProvaModal } from "../components/modals/NovaProva";
import { ExcluirProvaModal } from "../components/modals/ExcluirProva";
import { ListaProvas } from "./ListaProvas";
import { DetalheProva } from "./DetalheProva";

/** Stable key for a card's exam grouping (`exam_id`, or a sentinel when somehow unset). */
function examKey(card: CardModel): number {
  return card.exam_id ?? -1;
}

/** Per-exam heading metadata used by the board (name + whether the exam is in its reta final). */
interface ExamMeta {
  name: string;
  urgent: boolean;
}

interface ExamGroup {
  key: number;
  name: string;
  urgent: boolean;
  cards: CardModel[];
}

/** Group a column's cards by exam, labeling each heading from the real exam names. */
function groupByExam(cards: CardModel[], meta: Map<number, ExamMeta>): ExamGroup[] {
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
  return order.map((key) => ({
    key,
    name: meta.get(key)?.name ?? (key < 0 ? "Sem prova" : `Prova #${key}`),
    urgent: meta.get(key)?.urgent ?? false,
    cards: byKey.get(key)!,
  }));
}

/** The board context line, matching the spaced board's rhythm: "Segunda, 31 de julho · N provas". */
function provaContext(examCount: number, today: ISODate): string {
  const [y, m, d] = today.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekdayLong = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(date);
  const weekday = weekdayLong.split("-")[0];
  const cap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const dm = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(date);
  const provas = examCount === 1 ? "1 prova" : `${examCount} provas`;
  return examCount === 0 ? `${cap}, ${dm} · nenhuma prova ainda` : `${cap}, ${dm} · ${provas}`;
}

/** The small DM-Mono date shown at the right of each Prova column header (handoff QuadroProva). */
const PROVA_COLUMN_DATE: Record<Column, string> = {
  hoje: "hoje",
  amanha: "amanhã",
  proximos: "próx. dias",
  concluidos: "feitas",
};

/** A short "ontem" / "27 jul" completion label for a concluded card. */
function completedLabel(iso: ISODate | null, today: ISODate): string | undefined {
  if (!iso) return undefined;
  if (iso === today) return "hoje";
  if (iso === addDaysIso(today, -1)) return "ontem";
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" })
    .format(new Date(y, m - 1, d))
    .replace(" de ", " ")
    .replace(".", "");
}

/** Rail items straight from the exam read projections (name / date / progress / concluded). */
function railItems(exams: ExamView[]): ExamRailItem[] {
  return exams.map((e) => ({
    id: e.id,
    name: e.name,
    examDate: e.exam_date,
    completed: e.completed_sessions,
    total: e.total_sessions,
    concluded: e.concluded,
  }));
}

type View = { kind: "board" } | { kind: "lista" } | { kind: "detalhe"; examId: number };

export function QuadroProva() {
  const today = todayIso();
  const viewport = useViewport();
  const isPhone = viewport === "phone";
  const board = useBoard("ExamPrep");
  const examsQuery = useExams();
  const cursorsQuery = useSessionCursors();
  const createExam = useCreateExam();
  const deleteExam = useDeleteExam();
  // Same card interaction hub the spaced board uses — clicking a Prova card opens its detail and the
  // study session (completing advances the exam-session cursor via the method-dispatching api).
  const hub = useCardHub("ExamPrep");

  const boardSearch = useStore((s) => s.boardSearch);
  const boardTechnique = useStore((s) => s.boardTechnique);
  const cards = filterBoardCards(board.data ?? [], boardSearch, boardTechnique);
  const exams = examsQuery.data ?? [];
  // Card id → its "Sessão N de M" cursor, for the ProvaCard badge (KAN-04).
  const cursorById = new Map((cursorsQuery.data ?? []).map((c) => [c.card_id, c] as const));
  // An active exam card's live due date is its cursor session's date; archived cards have none. If
  // the cursors query hasn't resolved yet, treat an active card as due today (pending) rather than
  // flashing it into Concluídos.
  const examDue = (card: CardModel): ISODate | null =>
    cursorById.get(card.id)?.due_date ?? (card.archived ? null : today);
  const meta = new Map<number, ExamMeta>(
    exams.map(
      (e) =>
        [e.id, { name: e.name, urgent: !e.concluded && e.days_remaining >= 0 && e.days_remaining <= 3 }] as const,
    ),
  );

  const [view, setView] = useState<View>({ kind: "board" });
  const [showNova, setShowNova] = useState(false);
  const [deleteExamId, setDeleteExamId] = useState<number | null>(null);

  const columns: Record<Column, CardModel[]> = {
    hoje: [],
    amanha: [],
    proximos: [],
    concluidos: [],
  };
  for (const card of cards) {
    // Exam cards are placed by their session cursor's due date (AD-014), so completing a session
    // moves the card to the next session's column instead of freezing it at creation. An active card
    // always has a live cursor in steady state; if the cursors query hasn't resolved yet, fall back
    // to today (pending) rather than briefly flashing the card into Concluídos.
    const due = examDue(card);
    columns[placeAtDue(card.archived, due, today).column].push(card);
  }

  /** Active cards attached to an exam (drives the delete confirmation's "tópicos" list). */
  const cardsForExam = (examId: number) => cards.filter((c) => c.exam_id === examId);

  const novaProva = showNova && (
    <NovaProvaModal
      today={today}
      onClose={() => setShowNova(false)}
      onCreate={(name, examDate) => {
        createExam.mutate({ name, examDate });
        setShowNova(false);
      }}
    />
  );

  const excluirProva =
    deleteExamId !== null &&
    (() => {
      const exam = exams.find((e) => e.id === deleteExamId);
      if (!exam) return null;
      return (
        <ExcluirProvaModal
          examName={exam.name}
          cardTitles={cardsForExam(exam.id).map((c) => c.title)}
          onConfirm={() => {
            deleteExam.mutate(exam.id);
            setDeleteExamId(null);
            setView({ kind: "board" });
          }}
          onClose={() => setDeleteExamId(null)}
        />
      );
    })();

  if (view.kind === "lista") {
    return (
      <>
        <ListaProvas
          exams={exams}
          today={today}
          onBack={() => setView({ kind: "board" })}
          onNewExam={() => setShowNova(true)}
          onOpenExam={(examId) => setView({ kind: "detalhe", examId })}
        />
        {novaProva}
        {excluirProva}
      </>
    );
  }

  if (view.kind === "detalhe") {
    const exam = exams.find((e) => e.id === view.examId);
    if (!exam) {
      return (
        <ListaProvas
          exams={exams}
          today={today}
          onBack={() => setView({ kind: "board" })}
          onNewExam={() => setShowNova(true)}
          onOpenExam={(examId) => setView({ kind: "detalhe", examId })}
        />
      );
    }
    return (
      <>
        <DetalheProva
          exam={exam}
          cards={cardsForExam(exam.id)}
          today={today}
          onBack={() => setView({ kind: "lista" })}
          onDelete={() => setDeleteExamId(exam.id)}
        />
        {excluirProva}
      </>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        // Phone: the shell's section is the page scroller, so this screen sizes to its content
        // rather than nesting a second scroll area inside a squeezed viewport (RWD-02).
        height: isPhone ? "auto" : "100%",
        minHeight: 0,
        padding: isPhone ? "0 16px 24px" : "0 22px 20px",
      }}
    >
      {/* Context line + exam management, balanced like the spaced board's header. Phone stacks
          them: the context sentence and the button never share 328px without one being clipped. */}
      <div
        style={{
          flex: "none",
          display: "flex",
          flexDirection: isPhone ? "column" : "row",
          alignItems: isPhone ? "stretch" : "center",
          justifyContent: "space-between",
          gap: isPhone ? 10 : 16,
          paddingTop: 2,
        }}
      >
        <span style={{ font: "400 12.5px/1.35 var(--font-sans)", color: "var(--text-2)" }}>
          {provaContext(exams.length, today)}
        </span>
        <GerenciarButton onClick={() => setView({ kind: "lista" })} fullWidth={isPhone} />
      </div>

      <div style={{ display: "flex", flexDirection: isPhone ? "column" : "row", gap: 12, flex: isPhone ? "none" : 1, minHeight: isPhone ? undefined : 0, alignItems: "stretch" }}>
        <ExamsRail
          exams={railItems(exams)}
          today={today}
          fullWidth={isPhone}
          onOpenExam={(examId) => setView({ kind: "detalhe", examId })}
        />

        <div
          style={{
            flex: isPhone ? "none" : 1,
            minWidth: 0,
            minHeight: isPhone ? undefined : 0,
            display: "grid",
            gridTemplateColumns: boardGridColumns(viewport),
            gap: isPhone ? 14 : 12,
            alignItems: isPhone ? "start" : "stretch",
          }}
        >
          {COLUMN_ORDER.map((column) => (
            <ProvaColumn
              key={column}
              column={column}
              groups={groupByExam(columns[column], meta)}
              today={today}
              cursors={cursorById}
              stacked={isPhone}
              onOpen={hub.open}
            />
          ))}
        </div>
      </div>

      {hub.modals}
      {novaProva}
      {excluirProva}
    </div>
  );
}

/** "Gerenciar provas" — a secondary action that opens the exam list; hovers to a stronger border. */
function GerenciarButton({ onClick, fullWidth = false }: { onClick: () => void; fullWidth?: boolean }) {
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
        // Phone: full-width and 44px tall, so it reads as the screen's action rather than a chip
        // fighting the context line for the same row (RWD-04).
        justifyContent: fullWidth ? "center" : undefined,
        width: fullWidth ? "100%" : undefined,
        minHeight: fullWidth ? 44 : undefined,
        gap: 7,
        padding: fullWidth ? "0 15px" : "9px 15px",
        borderRadius: "var(--radius-md)",
        border: `1px solid ${hover ? "var(--border-strong)" : "var(--border)"}`,
        background: "var(--surface)",
        color: "var(--text)",
        font: `600 ${fullWidth ? 13.5 : 12.5}px/1 var(--font-sans)`,
        cursor: "pointer",
        flex: "none",
        transition: "border-color var(--transition-fast)",
      }}
    >
      Gerenciar provas
    </button>
  );
}

interface ProvaColumnProps {
  column: Column;
  groups: ExamGroup[];
  today: ISODate;
  cursors: Map<number, SessionCursor>;
  /** Phone: the column sizes to its content and the page scrolls (matches the spaced board). */
  stacked?: boolean;
  onOpen: (card: CardModel) => void;
}

/** A Prova board column — the same chrome as the spaced board (radius 18, sticky header, internal
 *  scroll), but its cards are grouped under a coloured exam heading. When `stacked` (phone) the
 *  column grows to its content and the page scrolls instead of scrolling internally. */
function ProvaColumn({ column, groups, today, cursors, stacked = false, onOpen }: ProvaColumnProps) {
  const count = groups.reduce((n, g) => n + g.cards.length, 0);
  const showUrgent = column === "hoje" || column === "amanha";

  return (
    <section
      aria-label={COLUMN_LABELS[column]}
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
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
          overflowY: stacked ? "visible" : "auto",
          display: "flex",
          flexDirection: "column",
          gap: 14,
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
            {count}
          </span>
          <span style={{ flex: 1 }} />
          <span style={{ font: "400 10.5px/1 var(--font-mono)", color: "var(--text-3)" }}>
            {PROVA_COLUMN_DATE[column]}
          </span>
        </header>

        {groups.length === 0 ? (
          <EmptyState
            title={column === "amanha" ? "Nada marcado pra amanhã — respira." : "Sem sessões aqui."}
            compact={stacked}
          />
        ) : (
          groups.map((group) => {
            const color = examColor(group.key);
            return (
              <div key={group.key} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "0 3px" }}>
                  <span
                    aria-hidden
                    style={{ width: 7, height: 7, borderRadius: 999, background: color, flex: "none" }}
                  />
                  <span
                    style={{
                      font: "600 11px/1.2 var(--font-sans)",
                      color: "var(--text-2)",
                      letterSpacing: "-.005em",
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {group.name}
                  </span>
                  {group.urgent && showUrgent && (
                    <span
                      style={{
                        padding: "2px 7px",
                        borderRadius: 999,
                        background: "var(--atraso-soft)",
                        color: "var(--atraso-ink)",
                        font: "600 9.5px/1.3 var(--font-mono)",
                        whiteSpace: "nowrap",
                        flex: "none",
                      }}
                    >
                      reta final
                    </span>
                  )}
                </div>

                {group.cards.map((card) => {
                  const cursor = cursors.get(card.id);
                  const due = cursor?.due_date ?? (card.archived ? null : today);
                  const { overdueDays } = placeAtDue(card.archived, due, today);
                  return (
                    <ProvaCard
                      key={card.id}
                      title={card.title}
                      color={color}
                      technique={card.technique}
                      estMinutes={card.est_minutes}
                      focusedSecs={card.archived ? null : undefined}
                      overdueDays={overdueDays}
                      seq={card.archived ? null : cursor?.seq ?? null}
                      total={card.archived ? null : cursor?.total ?? null}
                      completed={card.archived}
                      completedLabel={completedLabel(card.last_completed_at, today)}
                      onClick={() => onOpen(card)}
                    />
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
