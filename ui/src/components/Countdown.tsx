// Countdown display (handoff "Countdown"). Renders a large mono clock from a remaining-seconds
// value plus an optional label. This is the presentational piece only — the timer state machine
// (start/pause/resume, focus→break) lands with the session screens (T28/T32).

export interface CountdownProps {
  /** Remaining time in whole seconds. */
  seconds: number;
  label?: string;
  running?: boolean;
}

/** Format a non-negative seconds count as `M:SS` (or `MM:SS`), matching the handoff timer. */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function Countdown({ seconds, label, running = true }: CountdownProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      {label && (
        <span
          style={{
            font: "600 11.5px/1 var(--font-sans)",
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: "var(--text-3)",
          }}
        >
          {label}
        </span>
      )}
      <span
        style={{
          font: "500 44px/1 var(--font-mono)",
          letterSpacing: "-.03em",
          color: running ? "var(--text)" : "var(--text-2)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {formatClock(seconds)}
      </span>
    </div>
  );
}
