// Card event log (HIST-04 — handoff "ModalLogCard"). Lists a single card's history events newest
// first, each showing the event kind, the stage transition (from → to) when the stage changed, and
// the technique / focused time recorded on the event. Composes the shared ModalShell.
//
// Presentational: the events are passed in (the board fetches the card's history and filters by
// card id) so this component stays JSX-only over its props.

import type { HistoryEvent, Stage } from "../../lib/bindings";
import { ModalShell } from "../ModalShell";
import { TECHNIQUE_LABEL } from "../TechniqueChip";

const STAGE_LABEL: Record<Stage, string> = {
  Day0: "Dia 0",
  Day1: "Dia 1",
  Day2: "Dia 2",
  Day5: "Dia 5",
  Day15: "Dia 15",
  Day30: "Dia 30",
  Done: "Concluído",
};

interface KindStyle {
  glyph: string;
  label: string;
  bg: string;
  ink: string;
}

const KIND: Record<string, KindStyle> = {
  created: { glyph: "＋", label: "Card criado", bg: "var(--accent-soft)", ink: "var(--accent-soft-ink)" },
  completed: { glyph: "✓", label: "Estudo concluído", bg: "var(--revisar-soft)", ink: "var(--revisar-ink)" },
  postponed: { glyph: "→", label: "Adiado", bg: "var(--surface-3)", ink: "var(--text-2)" },
  restart: { glyph: "↻", label: "Recomeçou o estudo", bg: "var(--atraso-soft)", ink: "var(--atraso-ink)" },
  erase: { glyph: "⟲", label: "Progresso apagado", bg: "var(--atraso-soft)", ink: "var(--atraso-ink)" },
  archived: { glyph: "▤", label: "Card arquivado", bg: "var(--surface-3)", ink: "var(--text-2)" },
  revived: { glyph: "↑", label: "Card reativado", bg: "var(--accent-soft)", ink: "var(--accent-soft-ink)" },
};

function kindStyle(kind: string): KindStyle {
  return KIND[kind] ?? { glyph: "•", label: kind, bg: "var(--surface-3)", ink: "var(--text-2)" };
}

/** The stage-change chip text, or null when the stage did not move (e.g. created / postpone). */
function transitionText(event: HistoryEvent): string | null {
  if (event.from_stage === event.to_stage) {
    // restart keeps the stage — surface that explicitly; other same-stage events show nothing.
    return event.kind === "restart" ? `mantém ${STAGE_LABEL[event.from_stage]}` : null;
  }
  return `${STAGE_LABEL[event.from_stage]} → ${STAGE_LABEL[event.to_stage]}`;
}

/** The technique / focused-time detail line, or null when there is nothing to show. */
function detailText(event: HistoryEvent): string | null {
  const parts: string[] = [];
  if (event.technique) parts.push(TECHNIQUE_LABEL[event.technique]);
  if (event.focused_secs != null) parts.push(`${Math.round(event.focused_secs / 60)} min`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export interface LogCardModalProps {
  open?: boolean;
  cardTitle: string;
  events: HistoryEvent[];
  onClose?: () => void;
}

export function LogCardModal({ open = true, cardTitle, events, onClose }: LogCardModalProps) {
  // Newest first (events are recorded in chronological order, so a descending id sort is reverse-time).
  const ordered = [...events].sort((a, b) => b.id - a.id);
  const summary = `${ordered.length} ${ordered.length === 1 ? "evento" : "eventos"}`;

  return (
    <ModalShell
      open={open}
      title="Log do card"
      subtitle={`${cardTitle} · ${summary}`}
      onClose={onClose}
    >
      {ordered.length === 0 ? (
        <div style={{ font: "400 12.5px/1.5 var(--font-sans)", color: "var(--text-2)", padding: "20px 4px", textAlign: "center" }}>
          Ainda não há eventos. Cada estudo, adiamento ou mudança de estágio vai aparecer aqui.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {ordered.map((event, i) => {
            const style = kindStyle(event.kind);
            const transition = transitionText(event);
            const detail = detailText(event);
            const last = i === ordered.length - 1;
            return (
              <div key={event.id} style={{ display: "flex", gap: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 30, flex: "none" }}>
                  <span
                    aria-hidden
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 10,
                      background: style.bg,
                      color: style.ink,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      font: "700 12px/1 var(--font-sans)",
                    }}
                  >
                    {style.glyph}
                  </span>
                  {!last && <div style={{ width: 2, flex: 1, minHeight: 20, background: "var(--border)", margin: "4px 0" }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: 18, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                    <span style={{ font: "600 13.5px/1.2 var(--font-sans)", color: "var(--text)" }}>{style.label}</span>
                    {transition && (
                      <span
                        style={{
                          padding: "2px 9px",
                          borderRadius: "var(--radius-pill)",
                          background: "var(--surface-2)",
                          border: "1px solid var(--border)",
                          font: "500 10.5px/1.4 var(--font-mono, var(--font-sans))",
                          color: "var(--text-2)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {transition}
                      </span>
                    )}
                  </div>
                  {detail && (
                    <div style={{ font: "400 12px/1.4 var(--font-sans)", color: "var(--text-2)", marginTop: 4 }}>
                      {detail}
                    </div>
                  )}
                  <div style={{ font: "400 11px/1 var(--font-mono, var(--font-sans))", color: "var(--text-3)", marginTop: 5 }}>
                    {event.when}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ModalShell>
  );
}
