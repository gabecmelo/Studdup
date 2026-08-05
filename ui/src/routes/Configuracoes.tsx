// Configurações — global per-technique session-length defaults (TECH-09.5, AD-010) plus theme.
// The defaults are stored in the settings table (via get_setting/set_setting) and applied only to
// cards created afterwards, never retroactively — this screen edits the stored values; the New Card
// modal reads them. Each default is bounded to 5–180 minutes, the same range the card estimate uses.

import { useEffect, useState } from "react";
import type { Technique } from "../lib/bindings";
import { commands } from "../lib/commands";
import {
  defaultEstForTechnique,
  defaultEstSettingKey,
  EST_MAX,
  EST_MIN,
  isEstInRange,
} from "../lib/sessionEstimate";
import { TECHNIQUE_LABEL, TECHNIQUE_SUMMARY } from "../components/TechniqueChip";
import type { Theme } from "../styles/theme";

/** The techniques that carry a configurable default estimate (all four; "none" has no estimate). */
const TECHNIQUES: readonly Technique[] = ["Pomodoro", "ActiveRecall", "Feynman", "Leitner"];

/** The built-in fallback default for a technique when no global override is stored yet. */
function builtinDefault(technique: Technique): number {
  return defaultEstForTechnique(technique) ?? EST_MIN;
}

export function Configuracoes({
  theme,
  onChooseTheme,
}: {
  /** The theme currently in effect (owned by the shell, so the sidebar pills stay in sync). */
  theme: Theme;
  onChooseTheme: (t: Theme) => void;
}) {
  // Per-technique current value in the inputs; seeded from the built-ins, then overwritten by any
  // stored settings once they load.
  const [values, setValues] = useState<Record<Technique, number>>(() => ({
    Pomodoro: builtinDefault("Pomodoro"),
    ActiveRecall: builtinDefault("ActiveRecall"),
    Feynman: builtinDefault("Feynman"),
    Leitner: builtinDefault("Leitner"),
  }));
  const [savedKey, setSavedKey] = useState<Technique | null>(null);

  // Load any stored global defaults on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const technique of TECHNIQUES) {
        try {
          const stored = await commands.getSetting(defaultEstSettingKey(technique));
          if (!cancelled && stored !== null) {
            const n = Number(stored);
            if (isEstInRange(n)) {
              setValues((v) => ({ ...v, [technique]: n }));
            }
          }
        } catch {
          // Ignore load failures — the built-in default stays in place.
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(technique: Technique) {
    const value = values[technique];
    if (!isEstInRange(value)) return;
    await commands.setSetting(defaultEstSettingKey(technique), String(value));
    setSavedKey(technique);
    window.setTimeout(() => setSavedKey((k) => (k === technique ? null : k)), 1800);
  }

  return (
    <div style={{ width: "100%", maxWidth: 800, display: "flex", flexDirection: "column", gap: 24 }}>
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={sectionTitle}>Padrões de técnica</span>
          <span style={sectionHint}>
            A duração estimada aplicada a novos cards de cada técnica. Vale só para cards criados
            depois — os já existentes não mudam.
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {TECHNIQUES.map((technique) => {
            const value = values[technique];
            const invalid = !isEstInRange(value);
            return (
              <div
                key={technique}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: 16,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: "600 13.5px/1.2 var(--font-sans)", color: "var(--text)" }}>
                    {TECHNIQUE_LABEL[technique]}
                  </div>
                  <div style={{ font: "400 11.5px/1.3 var(--font-sans)", color: "var(--text-3)" }}>
                    {TECHNIQUE_SUMMARY[technique]}
                  </div>
                </div>
                <input
                  type="number"
                  min={EST_MIN}
                  max={EST_MAX}
                  value={value}
                  aria-label={`Duração padrão de ${TECHNIQUE_LABEL[technique]} em minutos`}
                  aria-invalid={invalid}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [technique]: Number(e.target.value) }))
                  }
                  style={{
                    width: 84,
                    padding: "9px 11px",
                    borderRadius: 10,
                    background: "var(--bg)",
                    border: `1.5px solid ${invalid ? "var(--danger)" : "var(--border-strong)"}`,
                    color: "var(--text)",
                    font: "500 14px/1.3 var(--font-sans)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <span style={{ font: "500 12px/1 var(--font-sans)", color: "var(--text-3)" }}>min</span>
                <button
                  type="button"
                  onClick={() => save(technique)}
                  disabled={invalid}
                  style={{
                    padding: "9px 15px",
                    borderRadius: 10,
                    border: "none",
                    cursor: invalid ? "not-allowed" : "pointer",
                    font: "600 12.5px/1 var(--font-sans)",
                    background: invalid ? "var(--surface-3)" : "var(--accent)",
                    color: invalid ? "var(--text-3)" : "var(--accent-ink)",
                  }}
                >
                  {savedKey === technique ? "Salvo ✓" : "Salvar"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={sectionTitle}>Tema</span>
        {/* Shares the shell's theme owner, so choosing here also updates the sidebar pills. */}
        <div
          role="group"
          aria-label="Tema"
          style={{
            alignSelf: "flex-start",
            display: "flex",
            gap: 4,
            padding: 4,
            background: "var(--surface-3)",
            borderRadius: 12,
          }}
        >
          {(["light", "dark"] as const).map((t) => {
            const active = theme === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => onChooseTheme(t)}
                aria-pressed={active}
                style={{
                  padding: "9px 18px",
                  borderRadius: 9,
                  border: "none",
                  cursor: "pointer",
                  font: `${active ? 600 : 500} 13px/1 var(--font-sans)`,
                  background: active ? (t === "light" ? "var(--surface)" : "var(--bg)") : "transparent",
                  color: active ? "var(--text)" : "var(--text-2)",
                  boxShadow: active ? "var(--shadow-1)" : "none",
                  transition: "background var(--transition-fast), color var(--transition-fast)",
                }}
              >
                {t === "light" ? "Claro" : "Escuro"}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  font: "600 12px/1 var(--font-sans)",
  letterSpacing: ".08em",
  textTransform: "uppercase",
  color: "var(--text-3)",
};

const sectionHint: React.CSSProperties = {
  font: "400 12.5px/1.5 var(--font-sans)",
  color: "var(--text-2)",
};
