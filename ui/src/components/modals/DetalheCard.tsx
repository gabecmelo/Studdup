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

import type { Card, ISODate, Stage } from "../../lib/bindings";
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

function dueLabel(card: Card, today: ISODate): { text: string; note: string; danger: boolean } {
  if (card.archived) return { text: "—", note: "card fora do quadro", danger: false };
  const due = spacedDueDate(card.start_date, card.current_stage);
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
  onClose,
  onStudy,
  onEdit,
  onPostpone,
  onViewLog,
  onDelete,
  onRevive,
  onOpenLink,
}: DetalheCardModalProps) {
  if (!open) return null;

  const due = dueLabel(card, today);
  const overdue = !card.archived && daysBetween(spacedDueDate(card.start_date, card.current_stage), today) > 0;
  const status = card.archived
    ? { text: "Arquivado", bg: "var(--surface-3)", ink: "var(--text-2)" }
    : overdue
      ? { text: "Atrasado", bg: "var(--atraso-soft)", ink: "var(--atraso-ink)" }
      : { text: "Ativo", bg: "var(--accent-soft)", ink: "var(--accent-soft-ink)" };

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

          {overdue && (
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
            <StatCard label="Estágio atual" value={STAGE_LABEL[card.current_stage]} />
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
