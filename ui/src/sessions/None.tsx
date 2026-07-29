// Plain no-technique session (TECH-02.7, handoff "SessaoNenhuma"). For a card without a guided
// technique: the topic, its links, and a single "Concluir estudo" action that completes the card and
// lets the scheduler advance to the next review. No timer, no session mechanics — just study the
// material and mark it done. Also used as the stopgap session for techniques whose guided screens
// ship later (Active Recall / Feynman / Leitner are P2/P3).

import { LinkRow } from "../components/LinkRow";

export interface NoneSessionProps {
  cardTitle: string;
  contentLink?: string;
  reviewLink?: string;
  /** Complete the card (advances the spaced ladder / exam cursor). */
  onConcluir: () => void;
  onExit: () => void;
}

export function NoneSession({
  cardTitle,
  contentLink,
  reviewLink,
  onConcluir,
  onExit,
}: NoneSessionProps) {
  const hasLinks = Boolean(contentLink) || Boolean(reviewLink);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 14, padding: "22px 30px" }}>
        <span
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            font: "500 11px/1.4 var(--font-sans)",
            color: "var(--text-2)",
          }}
        >
          Estudo livre
        </span>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          onClick={onExit}
          style={{
            padding: "8px 13px",
            borderRadius: 11,
            border: "none",
            background: "transparent",
            color: "var(--text-3)",
            font: "500 12px/1 var(--font-sans)",
            cursor: "pointer",
          }}
        >
          Sair
        </button>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 30,
          padding: 30,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, maxWidth: 560, textAlign: "center" }}>
          <span aria-hidden style={{ width: 9, height: 9, borderRadius: 999, background: "var(--accent)" }} />
          <h2 style={{ margin: 0, font: "600 30px/1.2 var(--font-sans)", letterSpacing: "-.025em" }}>
            {cardTitle}
          </h2>
          <span style={{ font: "400 14px/1.55 var(--font-sans)", color: "var(--text-2)" }}>
            Sem técnica guiada — estude do seu jeito com o material abaixo. Quando terminar, marque
            como concluído pra agendar a próxima revisão.
          </span>
        </div>

        {hasLinks && (
          <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 10 }}>
            {contentLink && <LinkRow label="Material de conteúdo" url={contentLink} />}
            {reviewLink && <LinkRow label="Notas de revisão" url={reviewLink} />}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={onConcluir}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "15px 40px",
              borderRadius: 15,
              border: "none",
              cursor: "pointer",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              font: "600 15px/1 var(--font-sans)",
              boxShadow: "var(--shadow-accent)",
            }}
          >
            Concluir estudo
          </button>
          <span style={{ font: "400 11.5px/1 var(--font-sans)", color: "var(--text-3)" }}>
            agenda a próxima revisão automaticamente
          </span>
        </div>
      </div>
    </div>
  );
}
