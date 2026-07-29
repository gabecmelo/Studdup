// Pomodoro rhythm picker (TECH-09.3, AD-010). Presents the three presets — 25/5, 50/10, 90/20 —
// plus a "Personalizado" option that reveals focus/break number inputs. The selected rhythm's focus
// block is the card's estimated session length (derived by the parent via `estFromRhythm`), and the
// Pomodoro session runs exactly that focus/break pair. Defaults to 25/5. Presentational + controlled:
// the parent owns the current rhythm and re-derives the estimate on change.

import { useState } from "react";
import type { PomodoroRhythm } from "../lib/bindings";
import { RHYTHM_PRESETS } from "../lib/sessionEstimate";

export interface RhythmPickerProps {
  /** The current focus/break rhythm (controlled). */
  value: PomodoroRhythm;
  onChange: (rhythm: PomodoroRhythm) => void;
}

function sameRhythm(a: PomodoroRhythm, b: PomodoroRhythm): boolean {
  return a.focus_min === b.focus_min && a.break_min === b.break_min;
}

function isPreset(rhythm: PomodoroRhythm): boolean {
  return RHYTHM_PRESETS.some((p) => sameRhythm(p, rhythm));
}

export function RhythmPicker({ value, onChange }: RhythmPickerProps) {
  // "Custom mode" is sticky once entered so a user editing 25→24 (briefly a preset again) stays in
  // the custom inputs; it also opens automatically when the incoming value is not a preset.
  const [custom, setCustom] = useState<boolean>(() => !isPreset(value));

  function pickPreset(preset: PomodoroRhythm) {
    setCustom(false);
    onChange(preset);
  }

  function editFocus(focus_min: number) {
    onChange({ ...value, focus_min });
  }
  function editBreak(break_min: number) {
    onChange({ ...value, break_min });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {RHYTHM_PRESETS.map((preset) => {
          const selected = !custom && sameRhythm(preset, value);
          return (
            <button
              key={`${preset.focus_min}/${preset.break_min}`}
              type="button"
              aria-pressed={selected}
              onClick={() => pickPreset(preset)}
              style={presetBtn(selected)}
            >
              {preset.focus_min}/{preset.break_min}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={custom}
          onClick={() => setCustom(true)}
          style={presetBtn(custom)}
        >
          Personalizado
        </button>
      </div>

      {custom && (
        <div style={{ display: "flex", gap: 12 }}>
          <label style={numField}>
            <span style={numLabel}>Foco (min)</span>
            <input
              type="number"
              min={1}
              max={180}
              value={value.focus_min}
              aria-label="Minutos de foco"
              onChange={(e) => editFocus(Number(e.target.value))}
              style={numInput}
            />
          </label>
          <label style={numField}>
            <span style={numLabel}>Pausa (min)</span>
            <input
              type="number"
              min={1}
              max={60}
              value={value.break_min}
              aria-label="Minutos de pausa"
              onChange={(e) => editBreak(Number(e.target.value))}
              style={numInput}
            />
          </label>
        </div>
      )}

      <span style={{ font: "400 10.5px/1.3 var(--font-sans)", color: "var(--text-3)" }}>
        A sessão roda {value.focus_min} min de foco e {value.break_min} min de pausa. A estimativa do
        card usa o bloco de foco.
      </span>
    </div>
  );
}

function presetBtn(selected: boolean): React.CSSProperties {
  return {
    padding: "8px 13px",
    borderRadius: "var(--radius-pill)",
    cursor: "pointer",
    font: `${selected ? 600 : 500} 12.5px/1 var(--font-sans)`,
    background: selected ? "var(--accent-soft)" : "var(--surface-2)",
    color: selected ? "var(--accent-soft-ink)" : "var(--text-2)",
    border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
  };
}

const numField: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 5,
};

const numLabel: React.CSSProperties = {
  font: "600 10.5px/1 var(--font-sans)",
  letterSpacing: ".05em",
  textTransform: "uppercase",
  color: "var(--text-3)",
};

const numInput: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 11,
  background: "var(--bg)",
  border: "1.5px solid var(--border-strong)",
  color: "var(--text)",
  font: "500 14px/1.3 var(--font-sans)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
