// Delete exam confirmation (EXAM-04 — handoff "ModalExcluirProva"). Deleting an exam cascades to
// all of its cards and their sessions/history (delete_exam), so the confirmation names the exam and
// the number of cards ("tópicos") that go with it, listing the first few, before the destructive
// action. When the exam has no cards, the copy says so. "Excluir prova" is the only destructive
// control.

import { GhostBtn, DangerBtn } from "./confirmButtons";

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

const MAX_LISTED = 4;

export interface ExcluirProvaModalProps {
  open?: boolean;
  examName: string;
  /** Titles of the cards ("tópicos") that will be deleted with the exam. */
  cardTitles: string[];
  onConfirm?: () => void;
  onClose?: () => void;
}

export function ExcluirProvaModal({
  open = true,
  examName,
  cardTitles,
  onConfirm,
  onClose,
}: ExcluirProvaModalProps) {
  if (!open) return null;

  const count = cardTitles.length;
  const hasCards = count > 0;
  const listed = cardTitles.slice(0, MAX_LISTED);
  const rest = count - listed.length;
  const body = hasCards
    ? "Excluir esta prova apaga também todos os tópicos e o progresso de sessões que pertencem só a ela. As sessões já concluídas somem do seu histórico."
    : "Esta prova ainda não tem nenhum tópico de estudo vinculado. Ela será removida da sua trilha de provas.";
  const buttonText = hasCards
    ? `Excluir prova e ${count} ${count === 1 ? "tópico" : "tópicos"}`
    : "Excluir prova";

  return (
    <div role="presentation" onClick={onClose} style={OVERLAY}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={`Excluir ${examName}`}
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
              Excluir “{examName}”?
            </span>
            <span style={{ font: "400 13.5px/1.55 var(--font-sans)", color: "var(--text-2)" }}>{body}</span>
          </div>

          {hasCards && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 9,
                padding: 14,
                borderRadius: "var(--radius-lg)",
                background: "var(--danger-soft)",
              }}
            >
              <span style={{ font: "600 12px/1 var(--font-sans)", color: "var(--danger-ink)" }}>
                Também serão excluídos {count} {count === 1 ? "tópico" : "tópicos"}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {listed.map((title) => (
                  <div key={title} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span aria-hidden style={{ width: 4, height: 4, borderRadius: 999, background: "var(--danger-ink)", opacity: 0.7, flex: "none" }} />
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        font: "500 12px/1.3 var(--font-sans)",
                        color: "var(--danger-ink)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {title}
                    </span>
                  </div>
                ))}
                {rest > 0 && (
                  <span style={{ paddingLeft: 12, font: "500 11.5px/1.3 var(--font-sans)", color: "var(--danger-ink)", opacity: 0.85 }}>
                    + {rest} {rest === 1 ? "outro tópico" : "outros tópicos"}
                  </span>
                )}
              </div>
            </div>
          )}

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
          <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
          <DangerBtn onClick={onConfirm}>{buttonText}</DangerBtn>
        </div>
      </div>
    </div>
  );
}
