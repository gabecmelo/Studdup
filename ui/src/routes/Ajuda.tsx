// Ajuda (handoff "TelaAjuda") — the reference screen. Keyboard shortcuts, the two central concepts
// (Método = the *when*, Técnica = the *how*), and the offline-storage note. Static content, except
// the shortcut list reflects the shortcuts the app actually binds (AppShell keydown) so the help is
// honest; "Catálogo de técnicas" jumps to that screen.

import type { RouteKey } from ".";
import { useViewport } from "../lib/useViewport";

interface Hotkey {
  keys: string[];
  label: string;
  desc: string;
}

// Only shortcuts the app actually binds (see AppShell) — the help must not promise unwired keys.
const HOTKEYS: readonly Hotkey[] = [
  { keys: ["F1"], label: "Abrir a ajuda", desc: "de qualquer tela" },
  { keys: ["Ctrl", "H"], label: "Histórico", desc: "abre o histórico geral" },
  { keys: ["Ctrl", "B"], label: "Recolher menu", desc: "abre / fecha a barra lateral" },
  { keys: ["Esc"], label: "Fechar / sair", desc: "fecha modal ou sessão" },
];

export function Ajuda({ onNavigate }: { onNavigate?: (route: RouteKey) => void }) {
  const isPhone = useViewport() === "phone";
  return (
    <div
      style={{
        // Phone: the shell's section scrolls the page; this screen sizes to its content.
        height: isPhone ? "auto" : "100%",
        minHeight: 0,
        overflowY: isPhone ? "visible" : "auto",
        width: "100%",
        padding: isPhone ? "0 16px 24px" : "30px 24px 40px",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: isPhone ? 22 : 26 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {/* Titled by the phone top bar — see AppShell's PhoneTopBar. */}
          {!isPhone && (
            <span style={{ font: "600 27px/1.1 var(--font-sans)", letterSpacing: "-.025em", color: "var(--text)" }}>
              Ajuda
            </span>
          )}
          <span style={{ font: "400 13.5px/1.45 var(--font-sans)", color: "var(--text-2)" }}>
            {isPhone
              ? "Como o Studdup pensa: o que decide quando um card volta, e o que decide como você estuda."
              : "Como o Studdup pensa, e os atalhos pra andar rápido."}
          </span>
        </div>

        {/* Keyboard shortcuts are desktop-only content — a phone has no Ctrl key, and listing four
            unreachable bindings was the first thing the phone user scrolled past (RWD-01). */}
        {!isPhone && (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={sectionLabel}>Atalhos de teclado</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
            {HOTKEYS.map((h) => (
              <div key={h.label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 17px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, boxShadow: "var(--shadow-1)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, flex: "none" }}>
                  {h.keys.map((k) => (
                    <kbd
                      key={k}
                      style={{
                        minWidth: 26,
                        height: 28,
                        padding: "0 9px",
                        borderRadius: 8,
                        background: "var(--surface-2)",
                        border: "1px solid var(--border-strong)",
                        boxShadow: "0 1.5px 0 var(--border-strong)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        font: "600 12px/1 var(--font-mono)",
                        color: "var(--text)",
                      }}
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: "600 13.5px/1.2 var(--font-sans)", color: "var(--text)" }}>{h.label}</div>
                  <div style={{ font: "400 11.5px/1.3 var(--font-sans)", color: "var(--text-3)" }}>{h.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
        )}

        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={sectionLabel}>Os dois conceitos centrais</span>
          <div style={{ display: "flex", gap: isPhone ? 10 : 14, flexWrap: "wrap" }}>
            <ConceptCard
              badge="M"
              badgeBg="var(--accent-soft)"
              badgeInk="var(--accent-soft-ink)"
              title="Método"
              isPhone={isPhone}
            >
              O método decide <B>quando</B> um card volta pra você. <B>Repetição Espaçada</B> agenda
              revisões em intervalos que crescem (Dia 0, 1, 2, 5, 15, 30). <B>Prova</B> distribui as
              sessões até uma data-alvo. O método é escolhido ao criar o card e não muda depois.
            </ConceptCard>
            <ConceptCard
              badge="T"
              badgeBg="var(--revisar-soft)"
              badgeInk="var(--revisar-ink)"
              title="Técnica"
              isPhone={isPhone}
            >
              A técnica decide <B>como</B> você estuda numa sessão: Pomodoro, Active Recall, Feynman ou
              Leitner. Ela pode mudar a qualquer momento e não afeta o agendamento — só o ritual de
              estudo. Veja cada uma no{" "}
              <button
                type="button"
                onClick={() => onNavigate?.("tecnicas")}
                style={{ border: "none", background: "transparent", padding: 0, color: "var(--accent)", font: "inherit", cursor: "pointer" }}
              >
                Catálogo de técnicas
              </button>
              .
            </ConceptCard>
          </div>
        </section>

        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, background: "var(--revisar-soft)", color: "var(--revisar-ink)", display: "flex", alignItems: "center", justifyContent: "center", font: "400 12px/1 var(--font-sans)", flex: "none" }}>
            ✿
          </span>
          <span style={{ flex: 1, font: "400 12.5px/1.5 var(--font-sans)", color: "var(--text-2)" }}>
            {isPhone
              ? "Tudo fica salvo neste aparelho, offline. Nenhum dado sai do seu celular — nem login, nem nuvem."
              : "Tudo fica salvo neste computador, offline. Nenhum dado sai da sua máquina — nem login, nem nuvem."}
          </span>
        </div>
      </div>
    </div>
  );
}

function B({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: "var(--text)", fontWeight: 600 }}>{children}</strong>;
}

function ConceptCard({
  badge,
  badgeBg,
  badgeInk,
  title,
  isPhone,
  children,
}: {
  badge: string;
  badgeBg: string;
  badgeInk: string;
  title: string;
  isPhone: boolean;
  children: React.ReactNode;
}) {
  return (
    // `minWidth: 100%` on phone keeps the two cards stacked; the 280px desktop floor would have
    // overflowed a 328px content column once the gap is counted.
    <div style={{ flex: 1, minWidth: isPhone ? "100%" : 280, display: "flex", flexDirection: "column", gap: 11, padding: isPhone ? 18 : 22, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <span style={{ width: isPhone ? 36 : 40, height: isPhone ? 36 : 40, flex: "none", borderRadius: 12, background: badgeBg, color: badgeInk, display: "flex", alignItems: "center", justifyContent: "center", font: `600 ${isPhone ? 16 : 18}px/1 var(--font-sans)` }}>
          {badge}
        </span>
        <span style={{ font: `600 ${isPhone ? 16 : 17}px/1.2 var(--font-sans)`, color: "var(--text)" }}>{title}</span>
      </div>
      <p style={{ margin: 0, font: `400 ${isPhone ? 13 : 13.5}px/1.6 var(--font-sans)`, color: "var(--text-2)" }}>{children}</p>
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  font: "600 12px/1 var(--font-sans)",
  letterSpacing: ".08em",
  textTransform: "uppercase",
  color: "var(--text-3)",
};
