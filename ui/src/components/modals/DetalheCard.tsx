// Card detail hub (HIST-04 — handoff "DetalheCard"). A read-only overview of a single card: its
// status, method/technique context, current stage and due date, technique, links, and — for a
// spaced card — the full ladder schedule with completed / current / future markers. It also carries
// the card's action set, which differs by state (handoff "Done when"): an ACTIVE card offers
// Estudar / Editar / Adiar / Ver log / Excluir, while an ARCHIVED card offers Reativar / Ver log /
// Excluir. Presentational: all actions are callbacks the board/route wires (T26 wires the click,
// T27–T29 wire the individual flows).
//
// The detail is wider than the shared ModalShell (min 480px) allows, so it uses its own overlay
// panel; the narrower LogCard composes ModalShell.

import { useState } from "react";
import type { AttemptKind, Card, ISODate, Stage } from "../../lib/bindings";
import { useAddLeitnerItem, useAttempts, useLeitnerItems } from "../../lib/queries";
import { useEscapeToClose } from "../../lib/useEscapeToClose";
import { STAGE_OFFSET, addDaysIso, spacedDueDate } from "../Board";
import { daysBetween } from "../columns";
import { LinkRow } from "../LinkRow";
import { TECHNIQUE_LABEL, TECHNIQUE_SUMMARY } from "../TechniqueChip";

const STAGE_LABEL: Record<Stage, string> = {
  Day0: "Dia 0",
  Day1: "Dia 1",
  Day2: "Dia 2",
  Day5: "Dia 5",
  Day15: "Dia 15",
  Day30: "Dia 30",
  Done: "Concluído",
};

const METHOD_LABEL = {
  SpacedRepetition: "Repetição Espaçada",
  ExamPrep: "Prova",
} as const;

/** The spaced ladder in order (AD-003); the schedule timeline walks it. */
const LADDER: readonly Stage[] = ["Day0", "Day1", "Day2", "Day5", "Day15", "Day30"];

export interface DetalheCardModalProps {
  open?: boolean;
  card: Card;
  today: ISODate;
  /** For an exam card, its current session cursor (AD-014): the real due date and "Sessão N de M".
   *  Ignored for spaced cards, which derive everything from the ladder. */
  examDue?: ISODate | null;
  examSeq?: number | null;
  examTotal?: number | null;
  onClose?: () => void;
  onStudy?: () => void;
  onEdit?: () => void;
  onPostpone?: () => void;
  onViewLog?: () => void;
  onDelete?: () => void;
  onRevive?: () => void;
  onOpenLink?: (url: string) => void;
}

type ScheduleState = "done" | "current" | "future";

interface ScheduleRow {
  stage: Stage;
  date: ISODate;
  state: ScheduleState;
}

/** Walk the spaced ladder, marking each rung done / current / future against the card's stage. */
function spacedSchedule(card: Card): ScheduleRow[] {
  const current = STAGE_OFFSET[card.current_stage];
  return LADDER.map((stage) => {
    const off = STAGE_OFFSET[stage];
    let state: ScheduleState;
    if (card.archived || off < current) state = "done";
    else if (off === current) state = "current";
    else state = "future";
    return { stage, date: addDaysIso(card.start_date, off), state };
  });
}

/** The due-date stat for a resolved due date (spaced ladder date, or an exam card's cursor session
 *  date). `null` means the card has no live due date (archived / fully studied). */
function dueLabelFor(
  archived: boolean,
  due: ISODate | null,
  today: ISODate,
): { text: string; note: string; danger: boolean } {
  if (archived || due === null) return { text: "—", note: "card fora do quadro", danger: false };
  const overdue = daysBetween(due, today);
  if (overdue > 0) {
    return { text: "Venceu", note: `há ${overdue} ${overdue === 1 ? "dia" : "dias"} · ${due}`, danger: true };
  }
  if (overdue === 0) return { text: "Hoje", note: due, danger: false };
  return { text: due, note: "agendado", danger: false };
}

export function DetalheCardModal({
  open = true,
  card,
  today,
  examDue = null,
  examSeq = null,
  examTotal = null,
  onClose,
  onStudy,
  onEdit,
  onPostpone,
  onViewLog,
  onDelete,
  onRevive,
  onOpenLink,
}: DetalheCardModalProps) {
  useEscapeToClose(open ? onClose : undefined);
  if (!open) return null;

  const examMode = card.method === "ExamPrep";
  // The card's live due date: an exam card follows its session cursor (AD-014); a spaced card the
  // ladder anchor. This is what the header, status and Vencimento all read.
  const resolvedDue: ISODate | null = examMode
    ? examDue
    : spacedDueDate(card.start_date, card.current_stage);
  const due = dueLabelFor(card.archived, resolvedDue, today);
  const overdue = !card.archived && resolvedDue !== null && daysBetween(resolvedDue, today) > 0;
  // The "recomeçar / zerar" overdue banner is a spaced-only flow (it re-anchors the ladder); an exam
  // card just resumes its next session, so it never shows the banner.
  const showOverdueBanner = overdue && !examMode;
  const status = card.archived
    ? { text: "Arquivado", bg: "var(--surface-3)", ink: "var(--text-2)" }
    : overdue
      ? { text: "Atrasado", bg: "var(--atraso-soft)", ink: "var(--atraso-ink)" }
      : { text: "Ativo", bg: "var(--accent-soft)", ink: "var(--accent-soft-ink)" };
  // Left stat: an exam card shows its session cursor ("Sessão N de M"); a spaced card its ladder stage.
  const primaryStat =
    examMode && examSeq !== null && examTotal !== null
      ? { label: "Sessão", value: `${examSeq} de ${examTotal}` }
      : { label: "Estágio atual", value: STAGE_LABEL[card.current_stage] };

  const context = `${METHOD_LABEL[card.method]}${card.technique ? ` · técnica ${TECHNIQUE_LABEL[card.technique]}` : ""}`;
  const links = [
    { label: "Conteúdo", url: card.content_link },
    { label: "Revisão", url: card.review_link },
  ].filter((l) => l.url.trim().length > 0);

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "oklch(0 0 0 / 0.42)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={card.title}
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          flexDirection: "column",
          width: "min(640px, 100%)",
          maxHeight: "calc(100vh - 48px)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "var(--shadow-2)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            padding: "22px 24px 18px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface-2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap" }}>
            <span
              style={{
                padding: "5px 11px",
                borderRadius: "var(--radius-pill)",
                background: status.bg,
                color: status.ink,
                font: "600 11.5px/1.3 var(--font-sans)",
              }}
            >
              {status.text}
            </span>
            <span style={{ font: "400 12px/1 var(--font-mono, var(--font-sans))", color: "var(--text-3)" }}>
              {context}
            </span>
          </div>
          <div style={{ font: "600 22px/1.2 var(--font-sans)", letterSpacing: "-.02em", color: "var(--text)" }}>
            {card.title}
          </div>

          {showOverdueBanner && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "11px 14px",
                borderRadius: "var(--radius-lg)",
                background: "var(--atraso-soft)",
                color: "var(--atraso-ink)",
                font: "500 12.5px/1.4 var(--font-sans)",
              }}
            >
              Esperando há {due.note.replace(/^há /, "").split(" · ")[0]}. Quando você abrir para
              estudar, o Studdup pergunta se quer recomeçar mantendo o estágio ou zerar o progresso —
              sem cobrança.
            </div>
          )}

          {/* Action set — active vs archived */}
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
            {card.archived ? (
              <>
                <button type="button" onClick={onRevive} style={primaryBtn}>
                  Reativar card
                </button>
                <button type="button" onClick={onViewLog} style={ghostBtn}>
                  Ver log
                </button>
                <span style={{ flex: 1 }} />
                <button type="button" onClick={onDelete} style={dangerBtn}>
                  Excluir
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={onStudy} style={primaryBtn}>
                  {overdue ? "Retomar estudo" : "Estudar agora"}
                </button>
                <button type="button" onClick={onEdit} style={outlineBtn}>
                  Editar
                </button>
                <button type="button" onClick={onPostpone} style={outlineBtn}>
                  Adiar
                </button>
                <button type="button" onClick={onViewLog} style={ghostBtn}>
                  Ver log
                </button>
                <span style={{ flex: 1 }} />
                <button type="button" onClick={onDelete} style={dangerBtn}>
                  Excluir
                </button>
              </>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, padding: "20px 24px 26px" }}>
          <div style={{ display: "flex", gap: 14 }}>
            <StatCard label={primaryStat.label} value={primaryStat.value} />
            <StatCard label="Vencimento" value={due.text} note={due.note} danger={due.danger} />
          </div>

          {card.technique && (
            <Panel title="Técnica de estudo">
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ font: "600 14px/1.2 var(--font-sans)", color: "var(--text)" }}>
                  {TECHNIQUE_LABEL[card.technique]}
                </span>
                <span style={{ font: "400 12px/1.3 var(--font-sans)", color: "var(--text-2)" }}>
                  {TECHNIQUE_SUMMARY[card.technique]}
                </span>
              </div>
            </Panel>
          )}

          <Panel title="Links">
            {links.length === 0 ? (
              <span style={{ font: "500 12px/1.4 var(--font-sans)", color: "var(--text-2)" }}>
                Nenhum link ainda. Adicione o material de estudo em Editar.
              </span>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {links.map((l) => (
                  <LinkRow key={l.label} label={l.label} url={l.url} onOpen={onOpenLink} />
                ))}
              </div>
            )}
          </Panel>

          {/* Previous written attempts, for the retrieval techniques (TECH-04.4). */}
          {(card.technique === "ActiveRecall" || card.technique === "Feynman") && (
            <AttemptsPanel cardId={card.id} />
          )}

          {/* Front/back item editor, for Leitner cards (TECH-08.1). */}
          {card.technique === "Leitner" && <LeitnerItemsPanel cardId={card.id} />}

          {card.method === "SpacedRepetition" && (
            <Panel title="Agenda completa">
              <div style={{ display: "flex", flexDirection: "column" }}>
                {spacedSchedule(card).map((row, i, arr) => (
                  <ScheduleItem key={row.stage} row={row} last={i === arr.length - 1} />
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  note,
  danger,
}: {
  label: string;
  value: string;
  note?: string;
  danger?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "16px 18px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <span style={{ font: "600 10.5px/1 var(--font-sans)", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-3)" }}>
        {label}
      </span>
      <span style={{ font: "600 20px/1.15 var(--font-sans)", letterSpacing: "-.02em", color: danger ? "var(--atraso-ink)" : "var(--text)" }}>
        {value}
      </span>
      {note && <span style={{ font: "400 11.5px/1.3 var(--font-sans)", color: "var(--text-3)" }}>{note}</span>}
    </div>
  );
}

const ATTEMPT_KIND_LABEL: Record<AttemptKind, string> = {
  active_recall: "Active Recall",
  feynman: "Feynman",
};

/**
 * "Tentativas anteriores" — the card's past written attempts, newest first (the api returns them in
 * reverse-chronological order). Shown only for Active Recall / Feynman cards; empty until the first
 * session records one.
 */
function AttemptsPanel({ cardId }: { cardId: number }) {
  const attempts = useAttempts(cardId);
  const rows = attempts.data ?? [];
  return (
    <Panel title="Tentativas anteriores">
      {attempts.isLoading ? (
        <span style={{ font: "500 12px/1.4 var(--font-sans)", color: "var(--text-2)" }}>Carregando…</span>
      ) : rows.length === 0 ? (
        <span style={{ font: "500 12px/1.4 var(--font-sans)", color: "var(--text-2)" }}>
          Nenhuma tentativa ainda. Suas respostas escritas aparecem aqui depois da primeira sessão.
        </span>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((a) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: "13px 15px",
                borderRadius: "var(--radius-md)",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span
                  style={{
                    padding: "2px 9px",
                    borderRadius: "var(--radius-pill)",
                    background: "var(--accent-soft)",
                    color: "var(--accent-soft-ink)",
                    font: "600 10.5px/1.4 var(--font-sans)",
                  }}
                >
                  {ATTEMPT_KIND_LABEL[a.kind]}
                </span>
                <span style={{ flex: 1 }} />
                <span style={{ font: "400 11px/1 var(--font-mono, var(--font-sans))", color: "var(--text-3)" }}>
                  {a.created_at}
                </span>
              </div>
              <span style={{ font: "400 13px/1.55 var(--font-sans)", color: "var(--text)", whiteSpace: "pre-wrap" }}>
                {a.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/**
 * "Itens Leitner" — the front/back item editor for a Leitner card (TECH-08.1). Lists the card's
 * existing items (front, back, current box) and adds new pairs via `useAddLeitnerItem`; the Adicionar
 * button stays disabled until both fields are filled. New items enter box 1 due today (backend).
 */
function LeitnerItemsPanel({ cardId }: { cardId: number }) {
  const items = useLeitnerItems(cardId);
  const add = useAddLeitnerItem();
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  const rows = items.data ?? [];
  const canAdd = front.trim().length > 0 && back.trim().length > 0 && !add.isPending;

  function submit() {
    if (!canAdd) return;
    add.mutate(
      { cardId, front: front.trim(), back: back.trim() },
      {
        onSuccess: () => {
          setFront("");
          setBack("");
        },
      },
    );
  }

  return (
    <Panel title="Itens Leitner (frente / verso)">
      {items.isLoading ? (
        <span style={{ font: "500 12px/1.4 var(--font-sans)", color: "var(--text-2)" }}>Carregando…</span>
      ) : rows.length === 0 ? (
        <span style={{ font: "500 12px/1.4 var(--font-sans)", color: "var(--text-2)" }}>
          Nenhum item ainda. Adicione pares de frente e verso pra revisar por caixas.
        </span>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((it) => (
            <div
              key={it.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 13px",
                borderRadius: "var(--radius-md)",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ font: "600 13px/1.3 var(--font-sans)", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {it.front}
                </span>
                <span style={{ font: "400 12px/1.3 var(--font-sans)", color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {it.back}
                </span>
              </div>
              <span
                style={{
                  flex: "none",
                  padding: "3px 9px",
                  borderRadius: "var(--radius-pill)",
                  background: "var(--accent-soft)",
                  color: "var(--accent-soft-ink)",
                  font: "600 10.5px/1.4 var(--font-mono, var(--font-sans))",
                }}
              >
                Caixa {it.box_no}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add form: front + back, both required. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          value={front}
          onChange={(e) => setFront(e.target.value)}
          placeholder="Frente (pergunta)"
          aria-label="Frente do item"
          style={leitnerInput}
        />
        <input
          value={back}
          onChange={(e) => setBack(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Verso (resposta)"
          aria-label="Verso do item"
          style={leitnerInput}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canAdd}
          style={{
            ...baseBtn,
            alignSelf: "flex-start",
            padding: "10px 18px",
            background: canAdd ? "var(--accent)" : "var(--surface-3)",
            color: canAdd ? "var(--accent-ink)" : "var(--text-3)",
            cursor: canAdd ? "pointer" : "not-allowed",
            boxShadow: canAdd ? "var(--shadow-accent)" : "none",
          }}
        >
          Adicionar item
        </button>
      </div>
    </Panel>
  );
}

const leitnerInput: React.CSSProperties = {
  padding: "10px 13px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  font: "400 13px/1.4 var(--font-sans)",
  outline: "none",
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 18,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <span style={{ font: "600 13px/1 var(--font-sans)", color: "var(--text)" }}>{title}</span>
      {children}
    </div>
  );
}

function ScheduleItem({ row, last }: { row: ScheduleRow; last: boolean }) {
  const dotColor =
    row.state === "done" ? "var(--accent)" : row.state === "current" ? "var(--surface)" : "var(--surface-2)";
  const dotBorder =
    row.state === "current" ? "3px solid var(--accent)" : row.state === "done" ? "2px solid var(--accent)" : "2px solid var(--border-strong)";
  return (
    <div style={{ display: "flex", gap: 13 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 14, flex: "none" }}>
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: 999,
            background: dotColor,
            border: dotBorder,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {row.state === "done" && <span style={{ color: "var(--accent-ink)", font: "700 8px/1 var(--font-sans)" }}>✓</span>}
        </div>
        {!last && <div style={{ width: 2, flex: 1, minHeight: 20, background: "var(--border)", margin: "3px 0" }} />}
      </div>
      <div style={{ flex: 1, paddingBottom: 14, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ font: "600 12.5px/1.2 var(--font-sans)", color: row.state === "future" ? "var(--text-2)" : "var(--text)" }}>
            {STAGE_LABEL[row.stage]}
            {row.stage === "Day0" ? " · primeiro estudo" : row.stage === "Day30" ? " · revisão final" : " · revisão"}
          </span>
          {row.state === "current" && (
            <span
              style={{
                padding: "2px 7px",
                borderRadius: "var(--radius-pill)",
                background: "var(--accent-soft)",
                color: "var(--accent-soft-ink)",
                font: "600 9.5px/1.3 var(--font-sans)",
              }}
            >
              agora
            </span>
          )}
        </div>
        <div style={{ font: "400 11px/1.3 var(--font-mono, var(--font-sans))", color: "var(--text-3)", marginTop: 3 }}>
          {row.date}
        </div>
      </div>
    </div>
  );
}

const baseBtn: React.CSSProperties = {
  padding: "11px 16px",
  borderRadius: "var(--radius-md)",
  border: "none",
  cursor: "pointer",
  font: "600 13px/1 var(--font-sans)",
};

const primaryBtn: React.CSSProperties = {
  ...baseBtn,
  padding: "11px 20px",
  background: "var(--accent)",
  color: "var(--accent-ink)",
  boxShadow: "var(--shadow-accent)",
};

const outlineBtn: React.CSSProperties = {
  ...baseBtn,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  color: "var(--text)",
};

const ghostBtn: React.CSSProperties = {
  ...baseBtn,
  background: "transparent",
  color: "var(--text-2)",
};

const dangerBtn: React.CSSProperties = {
  ...baseBtn,
  background: "transparent",
  color: "var(--text-3)",
};
