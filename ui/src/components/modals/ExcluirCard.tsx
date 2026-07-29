// Delete card confirmation (HIST-01 — handoff "ModalExcluirCard"). A destructive confirmation that
// names the card in its title and spells out exactly what is lost, with distinct copy for an active
// card (removed from the board, progress erased) versus an archived one (its stored history is
// erased and it can no longer be revived). Deleting cascades the card's sessions, events and Leitner
// items in the core (delete_card). "Excluir card" is the only destructive control; "Cancelar" closes
// without change.

const OVERLAY: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 110,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  background: "oklch(0 0 0 / 0.42)",
};

export interface ExcluirCardModalProps {
  open?: boolean;
  cardTitle: string;
  /** Archived cards lose their stored history and can no longer be revived — distinct copy. */
  archived: boolean;
  onConfirm?: () => void;
  onClose?: () => void;
}

export function ExcluirCardModal({
  open = true,
  cardTitle,
  archived,
  onConfirm,
  onClose,
}: ExcluirCardModalProps) {
  if (!open) return null;

  const body = archived
    ? "Este card já está arquivado. Excluir agora apaga também o histórico guardado — não dá para reativar depois."
    : "O card sai do quadro e todo o progresso de estudo dele é apagado.";
  const items = archived
    ? ["O log completo de eventos some", "As sessões concluídas saem do histórico", "Não poderá mais ser reativado"]
    : ["O estágio atual e a agenda de revisões", "As sessões concluídas e o log de eventos", "Os links de conteúdo e revisão salvos"];

  return (
    <div role="presentation" onClick={onClose} style={OVERLAY}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={`Excluir ${cardTitle}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(440px, 100%)",
          display: "flex",
          flexDirection: "column",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "var(--shadow-2)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 15, padding: "26px 26px 20px" }}>
          <span
            aria-hidden
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              background: "var(--danger-soft)",
              color: "var(--danger-ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              font: "700 20px/1 var(--font-sans)",
            }}
          >
            !
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ font: "600 19px/1.25 var(--font-sans)", letterSpacing: "-.02em", color: "var(--text)" }}>
              Excluir “{cardTitle}”?
            </span>
            <span style={{ font: "400 13.5px/1.55 var(--font-sans)", color: "var(--text-2)" }}>{body}</span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: 14,
              borderRadius: "var(--radius-lg)",
              background: "var(--danger-soft)",
            }}
          >
            {items.map((text) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span aria-hidden style={{ width: 4, height: 4, borderRadius: 999, background: "var(--danger-ink)", opacity: 0.7, flex: "none" }} />
                <span style={{ font: "500 12px/1.3 var(--font-sans)", color: "var(--danger-ink)" }}>{text}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 7, font: "400 11.5px/1.4 var(--font-sans)", color: "var(--text-3)" }}>
            <span aria-hidden style={{ width: 5, height: 5, borderRadius: 999, background: "var(--text-3)", flex: "none" }} />
            Esta ação não pode ser desfeita.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            padding: "16px 24px",
            borderTop: "1px solid var(--border)",
            background: "var(--surface-2)",
          }}
        >
          <button type="button" onClick={onClose} style={ghostBtn}>
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} style={dangerBtn}>
            Excluir card
          </button>
        </div>
      </div>
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 11,
  border: "none",
  background: "transparent",
  color: "var(--text-2)",
  font: "600 13px/1 var(--font-sans)",
  cursor: "pointer",
};

const dangerBtn: React.CSSProperties = {
  padding: "10px 20px",
  borderRadius: 11,
  border: "none",
  background: "var(--danger)",
  color: "var(--accent-ink)",
  font: "600 13px/1 var(--font-sans)",
  cursor: "pointer",
  boxShadow: "0 6px 18px -8px var(--danger)",
};
