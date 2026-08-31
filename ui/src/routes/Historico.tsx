// Histórico (HIST-02/03/05, handoff "HistoricoGeral"). One unified view of every method's events,
// each labeled with its method + technique (HIST-02), filterable by method and technique with a live
// result count (HIST-03) — the Método filter (Espaçada / Prova) subsumes the old per-method tab, so
// there is a single view, not a tab toggle. Terminal (archived/Done) rows offer Reativar, which
// revives the card as a fresh first session (HIST-05). Empty states cover both "no events at all" and
// "no events for these filters".
//
// The unified event log is fetched once (useHistory(null,null)); the filters are applied client-side
// through the pure `historyFilter` helpers so the count updates without refetching.

import { useState } from "react";
import type { HistoryEvent, ISODate, Method, Technique } from "../lib/bindings";
import { useHistory, useReviveCard } from "../lib/queries";
import { EmptyState } from "../components/EmptyState";
import { TECHNIQUE_LABEL, TechniqueIcon } from "../components/TechniqueChip";
import { todayIso, addDaysIso } from "../components/Board";
import { useViewport } from "../lib/useViewport";
import { filterHistory, historyCount, isRevivable } from "./historyFilter";

const METHOD_LABEL: Record<Method, string> = {
  SpacedRepetition: "Repetição Espaçada",
  ExamPrep: "Prova",
};

/** Event kind → label + glyph + a coloured tile (mirrors the handoff event vocabulary). */
const KIND_META: Record<string, { label: string; glyph: string; bg: string; ink: string }> = {
  created: { label: "Card criado", glyph: "＋", bg: "var(--accent-soft)", ink: "var(--accent-soft-ink)" },
  completed: { label: "Estudo concluído", glyph: "✓", bg: "var(--revisar-soft)", ink: "var(--revisar-ink)" },
  postponed: { label: "Adiado", glyph: "→", bg: "var(--surface-3)", ink: "var(--text-2)" },
  restart: { label: "Recomeçou o estudo", glyph: "↻", bg: "var(--atraso-soft)", ink: "var(--atraso-ink)" },
  erase: { label: "Progresso apagado", glyph: "⟲", bg: "var(--atraso-soft)", ink: "var(--atraso-ink)" },
  archived: { label: "Card arquivado", glyph: "▤", bg: "var(--surface-3)", ink: "var(--text-2)" },
  revived: { label: "Card reativado", glyph: "✦", bg: "var(--accent-soft)", ink: "var(--accent-soft-ink)" },
};

function kindMeta(kind: string) {
  return KIND_META[kind] ?? { label: kind, glyph: "•", bg: "var(--surface-2)", ink: "var(--text-2)" };
}

/** Method → the row pill's colours (Prova reads in the revisar hue, Espaçada in the accent). */
function methodColors(method: Method): { bg: string; ink: string } {
  return method === "ExamPrep"
    ? { bg: "var(--revisar-soft)", ink: "var(--revisar-ink)" }
    : { bg: "var(--accent-soft)", ink: "var(--accent-soft-ink)" };
}

/** "hoje" / "ontem" / "3 dias" / "27 jul" from an event's ISO date, relative to today. */
function whenLabel(iso: ISODate, today: ISODate): string {
  if (iso === today) return "hoje";
  if (iso === addDaysIso(today, -1)) return "ontem";
  const [ty, tm, td] = today.split("-").map(Number);
  const [ey, em, ed] = iso.split("-").map(Number);
  const diff = Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(ey, em - 1, ed)) / 86_400_000);
  if (diff > 1 && diff <= 9) return `${diff} dias`;
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" })
    .format(new Date(ey, em - 1, ed))
    .replace(" de ", " ")
    .replace(".", "");
}

export function Historico() {
  const today = todayIso();
  const isPhone = useViewport() === "phone";
  const [methodFilter, setMethodFilter] = useState<Method | null>(null);
  const [techniqueFilter, setTechniqueFilter] = useState<Technique | null>(null);

  const query = useHistory(null, null);
  const allEvents = query.data ?? [];
  const revive = useReviveCard();

  const effectiveQuery = { method: methodFilter, technique: techniqueFilter };
  const events = filterHistory(allEvents, effectiveQuery);
  const count = historyCount(allEvents, effectiveQuery);
  const hasFilter = methodFilter !== null || techniqueFilter !== null;

  const clearFilters = () => {
    setMethodFilter(null);
    setTechniqueFilter(null);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: isPhone ? 12 : 16,
        // Phone: the shell's section is the page scroller; this screen sizes to its content.
        height: isPhone ? "auto" : "100%",
        minHeight: 0,
        padding: isPhone ? "0 16px 24px" : 0,
      }}
    >
      <div style={{ flex: "none", display: "flex", flexDirection: "column", gap: 5 }}>
        {/* Titled by the phone top bar — see AppShell's PhoneTopBar. */}
        {!isPhone && (
          <span style={{ font: "600 22px/1.1 var(--font-sans)", letterSpacing: "-.02em", color: "var(--text)" }}>
            Histórico
          </span>
        )}
        <span style={{ font: "400 13px/1.4 var(--font-sans)", color: "var(--text-2)" }}>
          {isPhone
            ? "Todos os eventos dos dois métodos. Filtre por método ou técnica."
            : "Tudo, os dois métodos — cada evento marcado com método e técnica. Filtre por método ou técnica."}
        </span>
      </div>

      {/* Phone: the groups stack, each with its label ABOVE its chips. Inline labels beside wrapping
          chip rows produced the ragged, mid-air alignment — the "Técnica" label floated next to the
          second of three wrapped rows. */}
      <div
        style={{
          flex: "none",
          display: "flex",
          flexDirection: isPhone ? "column" : "row",
          alignItems: isPhone ? "stretch" : "center",
          gap: isPhone ? 12 : 14,
          padding: isPhone ? 14 : "12px 16px",
          borderRadius: 14,
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          flexWrap: isPhone ? "nowrap" : "wrap",
        }}
      >
        <FilterGroup label="Método" stacked={isPhone}>
          <FilterChip label="Todos" big={isPhone} active={methodFilter === null} onClick={() => setMethodFilter(null)} />
          <FilterChip label="Espaçada" big={isPhone} active={methodFilter === "SpacedRepetition"} onClick={() => setMethodFilter("SpacedRepetition")} />
          <FilterChip label="Prova" big={isPhone} active={methodFilter === "ExamPrep"} onClick={() => setMethodFilter("ExamPrep")} />
        </FilterGroup>
        <div
          style={
            isPhone
              ? { height: 1, background: "var(--border)" }
              : { width: 1, height: 26, background: "var(--border)" }
          }
        />
        <FilterGroup label="Técnica" stacked={isPhone}>
          <FilterChip label="Todas" big={isPhone} active={techniqueFilter === null} onClick={() => setTechniqueFilter(null)} />
          {(["Pomodoro", "ActiveRecall", "Feynman", "Leitner"] as Technique[]).map((t) => (
            <FilterChip key={t} label={TECHNIQUE_LABEL[t]} big={isPhone} active={techniqueFilter === t} onClick={() => setTechniqueFilter(t)} />
          ))}
        </FilterGroup>
        {!isPhone && <span style={{ flex: 1 }} />}
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: isPhone ? "space-between" : undefined }}>
          <span style={{ font: "500 12px/1 var(--font-mono)", color: hasFilter ? "var(--accent-soft-ink)" : "var(--text-2)" }}>
            {count} {count === 1 ? "evento" : "eventos"}
          </span>
          {hasFilter && <LimparButton onClick={clearFilters} />}
        </div>
      </div>

      {allEvents.length === 0 ? (
        <EmptyState
          title="Seu histórico está vazio"
          description="Assim que você estudar o primeiro card, ele começa a se registrar aqui."
        />
      ) : events.length === 0 ? (
        <EmptyState
          title="Nenhum evento com esses filtros"
          description="Não há eventos com essa combinação. Tente afrouxar um dos filtros."
          actionLabel="Limpar filtros"
          onAction={clearFilters}
        />
      ) : (
        <div style={{ flex: isPhone ? "none" : 1, minHeight: 0, overflowY: isPhone ? "visible" : "auto", display: "flex", flexDirection: "column", gap: 8, paddingBottom: 8 }}>
          {events.map((e) => (
            <HistoryRow key={e.id} event={e} today={today} isPhone={isPhone} onRevive={() => revive.mutate(e.card_id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryRow({
  event,
  today,
  isPhone,
  onRevive,
}: {
  event: HistoryEvent;
  today: ISODate;
  isPhone: boolean;
  onRevive: () => void;
}) {
  const meta = kindMeta(event.kind);
  const mc = methodColors(event.method);
  const revivable = isRevivable(event);

  const pills = (
    <>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 999, background: mc.bg, color: mc.ink, font: "600 10px/1.3 var(--font-sans)", whiteSpace: "nowrap" }}>
        <span style={{ width: 5, height: 5, borderRadius: 999, background: "currentColor" }} />
        {METHOD_LABEL[event.method]}
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px 3px 7px", borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)", font: "600 10px/1.3 var(--font-sans)", whiteSpace: "nowrap" }}>
        {event.technique && <TechniqueIcon technique={event.technique} size={11} />}
        {event.technique ? TECHNIQUE_LABEL[event.technique] : "Sem técnica"}
      </span>
    </>
  );

  // Phone: two stacked rows — [glyph · what happened · when] over [method · técnica · Reativar].
  // The desktop row packs six columns into one line, which at 328px left the card title about
  // 40px wide.
  if (isPhone) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span aria-hidden style={{ width: 32, height: 32, borderRadius: 10, background: meta.bg, color: meta.ink, display: "flex", alignItems: "center", justifyContent: "center", font: "700 13px/1 var(--font-sans)", flex: "none" }}>
            {meta.glyph}
          </span>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ font: "600 14px/1.25 var(--font-sans)", color: "var(--text)" }}>{meta.label}</span>
            <span
              style={{
                font: "400 12px/1.3 var(--font-sans)",
                color: "var(--text-3)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {event.card_title ?? `Card #${event.card_id}`}
            </span>
          </div>
          <span style={{ flex: "none", font: "400 11px/1.4 var(--font-mono)", color: "var(--text-3)" }}>
            {whenLabel(event.when, today)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {pills}
          {revivable && (
            <>
              <span style={{ flex: 1 }} />
              <ReativarButton onClick={onRevive} />
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 13 }}>
      <span aria-hidden style={{ width: 30, height: 30, borderRadius: 9, background: meta.bg, color: meta.ink, display: "flex", alignItems: "center", justifyContent: "center", font: "700 12px/1 var(--font-sans)", flex: "none" }}>
        {meta.glyph}
      </span>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ font: "600 13.5px/1.25 var(--font-sans)", color: "var(--text)" }}>{meta.label}</span>
        <span
          style={{
            font: "400 11px/1.2 var(--font-sans)",
            color: "var(--text-3)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {event.card_title ?? `Card #${event.card_id}`}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "none" }}>{pills}</div>
      <span style={{ width: 72, textAlign: "right", font: "400 10.5px/1 var(--font-mono)", color: "var(--text-3)", flex: "none" }}>
        {whenLabel(event.when, today)}
      </span>
      {revivable && <ReativarButton onClick={onRevive} />}
    </div>
  );
}

function FilterGroup({ label, stacked = false, children }: { label: string; stacked?: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: stacked ? "column" : "row",
        alignItems: stacked ? "stretch" : "center",
        gap: stacked ? 8 : 7,
        minWidth: 0,
      }}
    >
      <span style={{ font: "600 10.5px/1 var(--font-sans)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-3)", flex: "none" }}>
        {label}
      </span>
      <div style={{ display: "flex", gap: stacked ? 7 : 5, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

function FilterChip({ label, active, big = false, onClick }: { label: string; active: boolean; big?: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        // `big` is the phone variant: 40px tall, a thumb-sized target (RWD-04).
        minHeight: big ? 40 : undefined,
        padding: big ? "0 15px" : "6px 12px",
        borderRadius: big ? 11 : 9,
        cursor: "pointer",
        font: `600 ${big ? 13 : 11.5}px/1 var(--font-sans)`,
        background: active ? "var(--accent)" : "var(--surface)",
        color: active ? "var(--accent-ink)" : "var(--text-2)",
        border: `1px solid ${active ? "var(--accent)" : hover ? "var(--border-strong)" : "var(--border)"}`,
        transition: "border-color var(--transition-fast)",
      }}
    >
      {label}
    </button>
  );
}

function LimparButton({ onClick }: { onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "6px 11px",
        borderRadius: 9,
        border: "none",
        background: hover ? "var(--accent-soft)" : "transparent",
        color: "var(--accent-soft-ink)",
        font: "600 11.5px/1 var(--font-sans)",
        cursor: "pointer",
        transition: "background var(--transition-fast)",
      }}
    >
      Limpar
    </button>
  );
}

function ReativarButton({ onClick }: { onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: "none",
        padding: "7px 12px",
        borderRadius: 9,
        border: `1px solid ${hover ? "var(--border-strong)" : "var(--border)"}`,
        background: hover ? "var(--surface-2)" : "transparent",
        color: "var(--text)",
        font: "600 11.5px/1 var(--font-sans)",
        cursor: "pointer",
        transition: "background var(--transition-fast), border-color var(--transition-fast)",
      }}
    >
      Reativar
    </button>
  );
}
