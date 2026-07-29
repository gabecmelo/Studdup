// Histórico (HIST-01/02/03/05, handoff "HistoricoMetodo"/"HistoricoGeral"). Two tabs: "Este método"
// shows only the active method's events (HIST-01); "Geral" shows every method's events, each labeled
// with its method + technique (HIST-02), filterable by method and technique with a live result count
// (HIST-03). Terminal (archived/Done) rows offer Reativar, which revives the card as a fresh first
// session (HIST-05). Empty states cover both "no events at all" and "no events for these filters".
//
// The unified event log is fetched once (useHistory(null,null)); the tabs and filters are applied
// client-side through the pure `historyFilter` helpers so the count updates without refetching.

import { useState } from "react";
import type { HistoryEvent, Method, Technique } from "../lib/bindings";
import { useHistory, useReviveCard } from "../lib/queries";
import { useStore } from "../store";
import { EmptyState } from "../components/EmptyState";
import { TECHNIQUE_LABEL } from "../components/TechniqueChip";
import { filterHistory, historyCount, isRevivable } from "./historyFilter";

type Tab = "method" | "all";

const METHOD_LABEL: Record<Method, string> = {
  SpacedRepetition: "Repetição Espaçada",
  ExamPrep: "Prova",
};

/** Event kind → a human label + glyph for the row (mirrors the handoff event vocabulary). */
const KIND_META: Record<string, { label: string; glyph: string }> = {
  created: { label: "Card criado", glyph: "＋" },
  completed: { label: "Estudo concluído", glyph: "✓" },
  postponed: { label: "Adiado", glyph: "→" },
  restart: { label: "Recomeçou o estudo", glyph: "↻" },
  erase: { label: "Progresso apagado", glyph: "⟲" },
  archived: { label: "Card arquivado", glyph: "▤" },
  revived: { label: "Card reativado", glyph: "✦" },
};

function kindMeta(kind: string) {
  return KIND_META[kind] ?? { label: kind, glyph: "•" };
}

export function Historico() {
  const activeMethod = useStore((s) => s.activeMethod);
  const [tab, setTab] = useState<Tab>("method");
  const [methodFilter, setMethodFilter] = useState<Method | null>(null);
  const [techniqueFilter, setTechniqueFilter] = useState<Technique | null>(null);

  const query = useHistory(null, null);
  const allEvents = query.data ?? [];
  const revive = useReviveCard();

  // "Este método" scopes to the active method; "Geral" applies the two filter chips.
  const effectiveQuery =
    tab === "method"
      ? { method: activeMethod, technique: null }
      : { method: methodFilter, technique: techniqueFilter };
  const events = filterHistory(allEvents, effectiveQuery);
  const count = historyCount(allEvents, effectiveQuery);
  const hasFilter = tab === "all" && (methodFilter !== null || techniqueFilter !== null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%", minHeight: 0 }}>
      {/* Tabs */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <span style={{ font: "400 13px/1.3 var(--font-sans)", color: "var(--text-2)" }}>
          {tab === "method"
            ? `Só de ${METHOD_LABEL[activeMethod]}.`
            : "Tudo, os dois métodos — cada evento marcado com método e técnica."}
        </span>
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: 4,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 11,
          }}
        >
          <TabButton label="Este método" active={tab === "method"} onClick={() => setTab("method")} />
          <TabButton label="Geral" active={tab === "all"} onClick={() => setTab("all")} />
        </div>
      </div>

      {/* Filters (Geral only) */}
      {tab === "all" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "12px 16px",
            borderRadius: 14,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            flexWrap: "wrap",
          }}
        >
          <FilterGroup label="Método">
            <FilterChip label="Todos" active={methodFilter === null} onClick={() => setMethodFilter(null)} />
            <FilterChip
              label="Espaçada"
              active={methodFilter === "SpacedRepetition"}
              onClick={() => setMethodFilter("SpacedRepetition")}
            />
            <FilterChip
              label="Prova"
              active={methodFilter === "ExamPrep"}
              onClick={() => setMethodFilter("ExamPrep")}
            />
          </FilterGroup>
          <div style={{ width: 1, height: 26, background: "var(--border)" }} />
          <FilterGroup label="Técnica">
            <FilterChip label="Todas" active={techniqueFilter === null} onClick={() => setTechniqueFilter(null)} />
            {(["Pomodoro", "ActiveRecall", "Feynman", "Leitner"] as Technique[]).map((t) => (
              <FilterChip
                key={t}
                label={TECHNIQUE_LABEL[t]}
                active={techniqueFilter === t}
                onClick={() => setTechniqueFilter(t)}
              />
            ))}
          </FilterGroup>
          <span style={{ flex: 1 }} />
          <span style={{ font: "500 12px/1 var(--font-mono, var(--font-sans))", color: "var(--text-2)" }}>
            {count} {count === 1 ? "evento" : "eventos"}
          </span>
          {hasFilter && (
            <button
              type="button"
              onClick={() => {
                setMethodFilter(null);
                setTechniqueFilter(null);
              }}
              style={{
                padding: "6px 11px",
                borderRadius: 9,
                border: "none",
                background: "transparent",
                color: "var(--accent-soft-ink)",
                font: "600 11.5px/1 var(--font-sans)",
                cursor: "pointer",
              }}
            >
              Limpar
            </button>
          )}
        </div>
      )}

      {/* List / empty states */}
      {allEvents.length === 0 ? (
        <EmptyState
          title="Seu histórico está vazio"
          description="Assim que você estudar o primeiro card, ele começa a se registrar aqui."
        />
      ) : events.length === 0 ? (
        <EmptyState
          title="Nenhum evento com esses filtros"
          description="Não há eventos com essa combinação. Tente afrouxar um dos filtros."
        />
      ) : (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            paddingBottom: 8,
          }}
        >
          {events.map((e) => (
            <HistoryRow
              key={e.id}
              event={e}
              onRevive={() => revive.mutate(e.card_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryRow({ event, onRevive }: { event: HistoryEvent; onRevive: () => void }) {
  const meta = kindMeta(event.kind);
  const revivable = isRevivable(event);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "13px 16px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 13,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          background: "var(--surface-2)",
          color: "var(--text-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          font: "700 12px/1 var(--font-sans)",
          flex: "none",
        }}
      >
        {meta.glyph}
      </span>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ font: "600 13.5px/1.25 var(--font-sans)", color: "var(--text)" }}>
          {meta.label}
        </span>
        <span style={{ font: "400 11px/1.2 var(--font-sans)", color: "var(--text-3)" }}>
          Card #{event.card_id}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "none" }}>
        <span style={pill("var(--accent-soft)", "var(--accent-soft-ink)")}>
          {METHOD_LABEL[event.method]}
        </span>
        <span style={pill("var(--surface-2)", "var(--text-2)")}>
          {event.technique ? TECHNIQUE_LABEL[event.technique] : "Sem técnica"}
        </span>
      </div>
      <span
        style={{
          width: 96,
          textAlign: "right",
          font: "400 10.5px/1 var(--font-mono, var(--font-sans))",
          color: "var(--text-3)",
          flex: "none",
        }}
      >
        {event.when}
      </span>
      {revivable && (
        <button
          type="button"
          onClick={onRevive}
          style={{
            flex: "none",
            padding: "7px 12px",
            borderRadius: 9,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text)",
            font: "600 11.5px/1 var(--font-sans)",
            cursor: "pointer",
          }}
        >
          Reativar
        </button>
      )}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{
        padding: "7px 13px",
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        font: `${active ? 600 : 500} 12px/1 var(--font-sans)`,
        background: active ? "var(--surface)" : "transparent",
        color: active ? "var(--text)" : "var(--text-2)",
        boxShadow: active ? "var(--shadow-1)" : "none",
      }}
    >
      {label}
    </button>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
      <span
        style={{
          font: "600 10.5px/1 var(--font-sans)",
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "var(--text-3)",
          flex: "none",
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 9,
        cursor: "pointer",
        font: "600 11.5px/1 var(--font-sans)",
        background: active ? "var(--accent)" : "var(--surface)",
        color: active ? "var(--accent-ink)" : "var(--text-2)",
        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
      }}
    >
      {label}
    </button>
  );
}

function pill(bg: string, ink: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 9px",
    borderRadius: 999,
    background: bg,
    color: ink,
    font: "600 10px/1.3 var(--font-sans)",
    whiteSpace: "nowrap",
  };
}
