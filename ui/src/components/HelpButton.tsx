// A small "(?)" affordance that opens a short "how to use this in the app" dialog for a study
// method or technique (content from lib/studyHelp). Used next to the method/technique pickers in
// Novo Card. The dialog is a light centered overlay above the modal it opens from; it closes on
// Escape (via the shared LIFO stack) and on an outside click.

import { useState } from "react";
import type { HelpTopic } from "../lib/studyHelp";
import { useEscapeToClose } from "../lib/useEscapeToClose";

export function HelpButton({ topic, ariaLabel }: { topic: HelpTopic; ariaLabel?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel ?? `Como usar ${topic.title} no app`}
        onClick={() => setOpen(true)}
        style={triggerBtn}
      >
        ?
      </button>
      {open && <HelpDialog topic={topic} onClose={() => setOpen(false)} />}
    </>
  );
}

function HelpDialog({ topic, onClose }: { topic: HelpTopic; onClose: () => void }) {
  useEscapeToClose(onClose);
  return (
    <div role="presentation" onClick={onClose} style={overlay}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Como usar no app: ${topic.title}`}
        onClick={(e) => e.stopPropagation()}
        style={card}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ font: "600 14.5px/1.2 var(--font-sans)", letterSpacing: "-.01em", color: "var(--text)" }}>
            Como usar no app · {topic.title}
          </span>
          <span style={{ flex: 1 }} />
          <button type="button" aria-label="Fechar" onClick={onClose} style={closeBtn}>
            ✕
          </button>
        </div>
        <p style={{ margin: 0, font: "400 12.5px/1.5 var(--font-sans)", color: "var(--text-2)" }}>
          {topic.intro}
        </p>
        <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
          {topic.steps.map((step, i) => (
            <li key={i} style={{ font: "400 12.5px/1.5 var(--font-sans)", color: "var(--text)" }}>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

const triggerBtn: React.CSSProperties = {
  flex: "none",
  width: 22,
  height: 22,
  borderRadius: 999,
  border: "1px solid var(--border-strong)",
  background: "var(--surface-2)",
  color: "var(--text-2)",
  font: "700 12px/1 var(--font-sans)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 130,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  background: "oklch(0 0 0 / 0.42)",
};

const card: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  width: "min(440px, 100%)",
  padding: "20px 22px",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-2xl)",
  boxShadow: "var(--shadow-2)",
};

const closeBtn: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 8,
  border: "none",
  background: "transparent",
  color: "var(--text-3)",
  font: "400 15px/1 var(--font-sans)",
  cursor: "pointer",
  flex: "none",
};
