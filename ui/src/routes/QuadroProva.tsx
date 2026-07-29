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
import type { Card as CardModel, ExamView } from "../lib/bindings";
import { useBoard, useCreateExam, useDeleteExam, useExams } from "../lib/queries";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { ExamsRail, type ExamRailItem } from "../components/ExamsRail";
import { placeCard, todayIso } from "../components/Board";
import { COLUMN_LABELS, COLUMN_ORDER, type Column } from "../components/columns";
import { NovaProvaModal } from "../components/modals/NovaProva";
import { ExcluirProvaModal } from "../components/modals/ExcluirProva";
import { ListaProvas } from "./ListaProvas";
import { DetalheProva } from "./DetalheProva";

/** Stable key for a card's exam grouping (`exam_id`, or a sentinel when somehow unset). */
function examKey(card: CardModel): number {
  return card.exam_id ?? -1;
}

interface ExamGroup {
  key: number;
  name: string;
  cards: CardModel[];
}

/** Group a column's cards by exam, labeling each heading from the real exam names. */
function groupByExam(cards: CardModel[], nameById: Map<number, string>): ExamGroup[] {
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
    name: nameById.get(key) ?? (key < 0 ? "Sem prova" : `Prova #${key}`),
    cards: byKey.get(key)!,
  }));
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
  const board = useBoard("ExamPrep");
  const examsQuery = useExams();
  const createExam = useCreateExam();
  const deleteExam = useDeleteExam();

  const cards = board.data ?? [];
  const exams = examsQuery.data ?? [];
  const nameById = new Map(exams.map((e) => [e.id, e.name] as const));

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
    columns[placeCard(card, today).column].push(card);
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
    <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => setView({ kind: "lista" })}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "9px 15px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            font: "600 12.5px/1 var(--font-sans)",
            cursor: "pointer",
          }}
        >
          Gerenciar provas
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <ExamsRail exams={railItems(exams)} today={today} />

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
            <ProvaColumn key={column} column={column} groups={groupByExam(columns[column], nameById)} today={today} />
          ))}
        </div>
      </div>

      {novaProva}
      {excluirProva}
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
