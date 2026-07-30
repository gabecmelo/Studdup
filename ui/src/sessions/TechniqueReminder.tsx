// Technique reminder banner (TECH-07.3). Sits at the top of every study session and reminds the user
// how to apply that card's technique. It can be dismissed for the current session, or suppressed for
// good via "não mostrar de novo" — the latter persists `reminder.<technique>.hidden = "1"` through the
// settings api, so future sessions of that technique start without it. The suppress key and decision
// live in the pure `reminder` module; this component only reads/writes the flag and renders.

import { useEffect, useState } from "react";
import type { Technique } from "../lib/bindings";
import { commands } from "../lib/commands";
import { TECHNIQUE_LABEL, TechniqueIcon } from "../components/TechniqueChip";
import { REMINDER_HOWTO, REMINDER_SUPPRESSED, isReminderSuppressed, reminderStorageKey } from "./reminder";

export function TechniqueReminder({ technique }: { technique: Technique }) {
  // "pending" until the stored flag is read, so a suppressed banner never flashes on mount.
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await commands.getSetting(reminderStorageKey(technique));
        if (!cancelled && !isReminderSuppressed(stored)) setVisible(true);
      } catch {
        // If the setting can't be read, err toward showing the guidance.
        if (!cancelled) setVisible(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [technique]);

  if (!visible || dismissed) return null;

  async function suppress() {
    setDismissed(true);
    try {
      await commands.setSetting(reminderStorageKey(technique), REMINDER_SUPPRESSED);
    } catch {
      // Persisting the preference is best-effort; the banner is already hidden this session.
    }
  }

  return (
    <div
      role="note"
      aria-label={`Como aplicar ${TECHNIQUE_LABEL[technique]}`}
      style={{
        flex: "none",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        margin: "0 30px 4px",
        padding: "13px 16px",
        borderRadius: 14,
        background: "var(--accent-soft)",
        border: "1px solid var(--accent)",
        color: "var(--accent-soft-ink)",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          background: "var(--surface)",
          color: "var(--accent-soft-ink)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "none",
        }}
      >
        <TechniqueIcon technique={technique} size={14} />
      </span>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ font: "600 12.5px/1.2 var(--font-sans)" }}>
          {TECHNIQUE_LABEL[technique]} — como aplicar
        </span>
        <span style={{ font: "400 12px/1.45 var(--font-sans)", color: "var(--text-2)" }}>
          {REMINDER_HOWTO[technique]}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "none" }}>
        <button
          type="button"
          onClick={suppress}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            padding: "6px 10px",
            borderRadius: 9,
            border: "1px solid var(--border)",
            background: hover ? "var(--surface-2)" : "var(--surface)",
            color: "var(--text-2)",
            font: "500 11px/1 var(--font-sans)",
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "background var(--transition-fast)",
          }}
        >
          Não mostrar de novo
        </button>
        <button
          type="button"
          aria-label="Dispensar lembrete"
          onClick={() => setDismissed(true)}
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            border: "none",
            background: "transparent",
            color: "var(--text-3)",
            font: "500 15px/1 var(--font-sans)",
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
