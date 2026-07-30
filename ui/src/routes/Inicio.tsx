// Início (handoff "TelaInicio") — the landing overview. A date + greeting header over one of two
// states:
//   - "trabalho": a "Para agora" hero counting the cards that come due today across BOTH methods,
//     with an "Estudar agora" CTA that opens the board, beside a "Provas próximas" countdown list;
//   - "calmo": a centered ✓ hero shown only when nothing is due today and no exam is on the horizon.
//
// Real data: the due-today count folds the spaced and exam boards through the same `placeCard`
// the board uses (KAN-01), and the exams come from `list_exams`. Presentational beyond those reads.

import type { Card as CardModel } from "../lib/bindings";
import { useBoard, useExams } from "../lib/queries";
import { placeCard, todayIso } from "../components/Board";
import { examColor } from "../components/examColor";
import type { RouteKey } from ".";

/** A time-of-day greeting (no stored user name, so no trailing name as in the mock). */
function greeting(hour: number): string {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

/** "Terça-feira, 28 de julho" — capitalized long date. */
function longToday(): string {
  const d = new Date();
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(d);
  const dm = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(d);
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${dm}`;
}

function dueToday(cards: CardModel[], today: string): number {
  return cards.filter((c) => !c.archived && placeCard(c, today).column === "hoje").length;
}

export function Inicio({ onNavigate }: { onNavigate?: (route: RouteKey) => void }) {
  const today = todayIso();
  const spaced = useBoard("SpacedRepetition");
  const exam = useBoard("ExamPrep");
  const examsQuery = useExams();

  const dueCount = dueToday(spaced.data ?? [], today) + dueToday(exam.data ?? [], today);
  const upcoming = (examsQuery.data ?? [])
    .filter((e) => !e.concluded && e.days_remaining >= 0)
    .sort((a, b) => a.days_remaining - b.days_remaining);

  const calmo = dueCount === 0 && upcoming.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, width: "100%", maxWidth: 1080, margin: "0 auto", padding: "34px 24px 24px" }}>
      <div style={{ flex: "none", display: "flex", flexDirection: "column", gap: 5, paddingBottom: 26 }}>
        <span style={{ font: "400 12.5px/1 var(--font-mono)", letterSpacing: ".02em", color: "var(--text-3)" }}>
          {longToday()}
        </span>
        <span style={{ font: "600 30px/1.1 var(--font-sans)", letterSpacing: "-.025em", color: "var(--text)" }}>
          {greeting(new Date().getHours())}
        </span>
      </div>

      {calmo ? (
        <CalmoHero onStudy={() => onNavigate?.("quadro")} />
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 26, alignItems: "stretch" }}>
          <ParaAgora dueCount={dueCount} onStudy={() => onNavigate?.("quadro")} />
          <ProvasProximas
            exams={upcoming.map((e) => ({ id: e.id, name: e.name, days: e.days_remaining }))}
            onOpen={() => onNavigate?.("quadro")}
          />
        </div>
      )}
    </div>
  );
}

function CalmoHero({ onStudy }: { onStudy: () => void }) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, textAlign: "center", paddingBottom: 40 }}>
      <div style={{ position: "relative", width: 132, height: 132, flex: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 999, background: "var(--accent-soft)", opacity: 0.5 }} />
        <div style={{ position: "absolute", inset: 18, borderRadius: 999, background: "var(--accent-soft)" }} />
        <div style={{ position: "relative", width: 60, height: 60, borderRadius: 999, background: "var(--accent)", color: "var(--accent-ink)", display: "flex", alignItems: "center", justifyContent: "center", font: "600 26px/1 var(--font-sans)", boxShadow: "var(--shadow-accent)" }}>
          ✓
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 11, maxWidth: 440 }}>
        <span style={{ font: "600 27px/1.15 var(--font-sans)", letterSpacing: "-.025em", color: "var(--text)" }}>
          Tudo em dia por hoje
        </span>
        <span style={{ font: "400 14.5px/1.6 var(--font-sans)", color: "var(--text-2)" }}>
          Nada vence hoje e nenhuma prova está no horizonte próximo. O Studdup avisa você quando algo
          pedir atenção — até lá, pode descansar tranquilo.
        </span>
      </div>
      <HoverChip onClick={onStudy} />
    </div>
  );
}

function HoverChip({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 18px", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-1)", cursor: "pointer" }}
    >
      <span style={{ font: "600 13px/1 var(--font-sans)", color: "var(--text-2)" }}>Estudar algo mesmo assim</span>
      <span style={{ font: "600 13px/1 var(--font-sans)", color: "var(--text-3)" }}>→</span>
    </button>
  );
}

function ParaAgora({ dueCount, onStudy }: { dueCount: number; onStudy: () => void }) {
  const nada = dueCount === 0;
  return (
    <div style={{ flex: 1.25, display: "flex", flexDirection: "column", gap: 22, padding: 32, borderRadius: 22, background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, font: "600 11px/1 var(--font-sans)", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text-3)" }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--accent)" }} />
        Para agora
      </div>

      {nada ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 56, height: 56, flex: "none", borderRadius: 16, background: "var(--accent-soft)", color: "var(--accent-soft-ink)", display: "flex", alignItems: "center", justifyContent: "center", font: "600 24px/1 var(--font-sans)" }}>
              ✓
            </div>
            <span style={{ font: "600 24px/1.15 var(--font-sans)", letterSpacing: "-.02em", color: "var(--text)" }}>
              Nada vence hoje
            </span>
          </div>
          <span style={{ font: "400 14px/1.55 var(--font-sans)", color: "var(--text-2)", maxWidth: 420 }}>
            Suas revisões estão em dia. Se quiser adiantar, dá pra estudar um pouco pensando na prova
            mais próxima.
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span style={{ font: "700 76px/0.9 var(--font-sans)", letterSpacing: "-.04em", color: "var(--accent)" }}>
              {dueCount}
            </span>
            <span style={{ font: "600 20px/1.15 var(--font-sans)", color: "var(--text)", paddingBottom: 6 }}>
              {dueCount === 1 ? "card vence hoje" : "cards vencem hoje"}
            </span>
          </div>
          <span style={{ font: "400 14px/1.55 var(--font-sans)", color: "var(--text-2)", maxWidth: 420 }}>
            Somando repetição espaçada e prova. O Studdup já organizou a ordem — é só começar pela
            primeira.
          </span>
        </div>
      )}

      <div style={{ flex: 1 }} />

      <CTAButton
        primary={!nada}
        label={nada ? "Ver o quadro" : "Estudar agora"}
        onClick={onStudy}
      />
      <span style={{ textAlign: "center", font: "400 12px/1.4 var(--font-sans)", color: "var(--text-3)", marginTop: -8 }}>
        {nada ? "Abre o quadro pra você escolher o que revisar" : "Abre o quadro pra começar pelo primeiro que vence hoje"}
      </span>
    </div>
  );
}

function CTAButton({ primary, label, onClick }: { primary: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: 17,
        borderRadius: 15,
        background: primary ? "var(--accent)" : "var(--surface-2)",
        color: primary ? "var(--accent-ink)" : "var(--text)",
        border: primary ? "none" : "1px solid var(--border-strong)",
        font: "600 16px/1 var(--font-sans)",
        cursor: "pointer",
        boxShadow: primary ? "var(--shadow-accent)" : "var(--shadow-1)",
        transition: "filter var(--transition-fast)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.04)")}
      onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
    >
      <span aria-hidden style={{ font: "700 12px/1 var(--font-sans)" }}>▶</span>
      {label}
    </button>
  );
}

function ProvasProximas({
  exams,
  onOpen,
}: {
  exams: { id: number; name: string; days: number }[];
  onOpen: () => void;
}) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, padding: 28, borderRadius: 22, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, font: "600 11px/1 var(--font-sans)", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text-3)" }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--revisar)" }} />
          Provas próximas
        </div>
        {exams.length > 0 && (
          <span style={{ font: "600 11px/1.4 var(--font-mono)", color: "var(--text-3)" }}>
            {exams.length} {exams.length === 1 ? "prova" : "provas"}
          </span>
        )}
      </div>

      {exams.length === 0 ? (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center", padding: "20px 10px" }}>
          <div style={{ width: 50, height: 50, borderRadius: 15, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", font: "600 20px/1 var(--font-sans)" }}>
            ◎
          </div>
          <span style={{ font: "600 15px/1.3 var(--font-sans)", color: "var(--text)" }}>Nenhuma prova marcada</span>
          <span style={{ font: "400 12.5px/1.5 var(--font-sans)", color: "var(--text-2)", maxWidth: 230 }}>
            Quando você criar um card com data de prova, a contagem regressiva aparece aqui.
          </span>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {exams.map((e) => {
            const urgent = e.days <= 3;
            const color = examColor(e.id);
            return (
              <button
                key={e.id}
                type="button"
                onClick={onOpen}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 16px", borderRadius: 15, background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-1)", cursor: "pointer", textAlign: "left" }}
              >
                <span
                  aria-hidden
                  style={{ width: 11, height: 11, flex: "none", borderRadius: 999, background: color, boxShadow: `0 0 0 4px color-mix(in oklab, ${color} 18%, transparent)` }}
                />
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ font: "600 14.5px/1.25 var(--font-sans)", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.name}
                  </span>
                  <span style={{ font: "400 11.5px/1 var(--font-sans)", color: "var(--text-3)" }}>Prova</span>
                </div>
                <div style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, padding: "5px 12px", borderRadius: 11, background: urgent ? "var(--atraso-soft)" : "var(--surface-2)", color: urgent ? "var(--atraso-ink)" : "var(--text-2)" }}>
                  <span style={{ font: "700 19px/0.95 var(--font-sans)", letterSpacing: "-.02em" }}>{e.days}</span>
                  <span style={{ font: "600 9.5px/1 var(--font-sans)", letterSpacing: ".04em", textTransform: "uppercase", opacity: 0.8 }}>
                    {e.days === 1 ? "dia" : "dias"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
