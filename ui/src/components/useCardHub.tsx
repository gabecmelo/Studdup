// Card interaction hub, shared by both boards (spaced Board + Prova QuadroProva). Clicking a card
// opens its detail; the detail routes to study / edit / postpone / log / delete, and the study action
// dispatches the right session screen by technique (Pomodoro / Active Recall / Feynman / Leitner /
// plain). Completing a session records it (advancing the spaced ladder or the exam-session cursor via
// the method-dispatching api). Kept method-agnostic so the Prova board gets the exact same flow as the
// spaced board — the only method difference is the overdue path (see `study`).

import { useState, type ReactNode } from "react";
import type { Card, Method, Stage } from "../lib/bindings";
import {
  useCompleteCard,
  useDeleteCard,
  useEditCard,
  useEraseCard,
  useHistory,
  usePostponeCard,
  useRecordAttempt,
  useRecordSession,
  useRestartCard,
} from "../lib/queries";
import { placeCard, todayIso } from "./Board";
import { DetalheCardModal } from "./modals/DetalheCard";
import { LogCardModal } from "./modals/LogCard";
import { EditarCardModal } from "./modals/EditarCard";
import { CardAtrasadoModal } from "./modals/CardAtrasado";
import { AdiarModal } from "./modals/Adiar";
import { ExcluirCardModal } from "./modals/ExcluirCard";
import { PomodoroSession } from "../sessions/Pomodoro";
import { NoneSession } from "../sessions/None";
import { ActiveRecallSession } from "../sessions/ActiveRecall";
import { FeynmanSession } from "../sessions/Feynman";
import { LeitnerSession } from "../sessions/Leitner";
import { sessionKind } from "../sessions/dispatch";

/** Spaced ladder stage → its "Dia N" label (mirrors the badge vocabulary, AD-003). */
const STAGE_LABEL: Record<Stage, string> = {
  Day0: "Dia 0",
  Day1: "Dia 1",
  Day2: "Dia 2",
  Day5: "Dia 5",
  Day15: "Dia 15",
  Day30: "Dia 30",
  Done: "Concluído",
};

export interface CardHub {
  /** Open a card's detail modal (wire to a card's click). */
  open: (card: Card) => void;
  /** Start a card's study flow directly (overdue spaced → Recomeçar/Apagar; else the session). */
  study: (card: Card) => void;
  /** The modal + session layer to render once, anywhere inside the board. */
  modals: ReactNode;
}

/** The shared detail/study/edit/postpone/log/delete + session hub for a method's board. */
export function useCardHub(method: Method): CardHub {
  const today = todayIso();

  const [detailCard, setDetailCard] = useState<Card | null>(null);
  const [logCard, setLogCard] = useState<Card | null>(null);
  const [editCard, setEditCard] = useState<Card | null>(null);
  const [overdueCard, setOverdueCard] = useState<Card | null>(null);
  const [postponeCard, setPostponeCard] = useState<Card | null>(null);
  const [deleteCard, setDeleteCard] = useState<Card | null>(null);
  const [sessionCard, setSessionCard] = useState<Card | null>(null);

  const postpone = usePostponeCard();
  const complete = useCompleteCard();
  const record = useRecordSession();
  const recordAttempt = useRecordAttempt();
  const edit = useEditCard();
  const restart = useRestartCard();
  const erase = useEraseCard();
  const remove = useDeleteCard();
  const history = useHistory(method);

  // The overdue Recomeçar/Apagar choice re-anchors the spaced ladder (restart/erase), so it only
  // applies to spaced cards; an exam-prep card goes straight to its session (completing advances the
  // exam-session cursor).
  function study(card: Card) {
    if (card.method === "SpacedRepetition" && placeCard(card, today).overdueDays > 0) {
      setOverdueCard(card);
    } else {
      setSessionCard(card);
    }
  }

  const modals = (
    <>
      {detailCard && (
        <DetalheCardModal
          card={detailCard}
          today={today}
          onClose={() => setDetailCard(null)}
          onStudy={() => {
            study(detailCard);
            setDetailCard(null);
          }}
          onEdit={() => {
            setEditCard(detailCard);
            setDetailCard(null);
          }}
          onPostpone={() => {
            setPostponeCard(detailCard);
            setDetailCard(null);
          }}
          onViewLog={() => {
            setLogCard(detailCard);
            setDetailCard(null);
          }}
          onDelete={() => {
            setDeleteCard(detailCard);
            setDetailCard(null);
          }}
          onRevive={() => {
            // An archived exam/spaced card in the Concluídos column can be revived as a fresh study.
            restart.mutate(detailCard.id);
            setDetailCard(null);
          }}
        />
      )}

      {logCard && (
        <LogCardModal
          cardTitle={logCard.title}
          events={(history.data ?? []).filter((e) => e.card_id === logCard.id)}
          onClose={() => setLogCard(null)}
        />
      )}

      {editCard && (
        <EditarCardModal
          card={editCard}
          onClose={() => setEditCard(null)}
          onSave={(updated) => {
            edit.mutate(updated);
            setEditCard(null);
          }}
        />
      )}

      {overdueCard && (
        <CardAtrasadoModal
          cardTitle={overdueCard.title}
          stageLabel={STAGE_LABEL[overdueCard.current_stage]}
          overdueDays={placeCard(overdueCard, today).overdueDays}
          onRestart={() => {
            restart.mutate(overdueCard.id);
            setOverdueCard(null);
          }}
          onErase={() => {
            erase.mutate(overdueCard.id);
            setOverdueCard(null);
          }}
          onClose={() => setOverdueCard(null)}
        />
      )}

      {postponeCard && (
        <AdiarModal
          cardTitle={postponeCard.title}
          stage={postponeCard.current_stage}
          technique={postponeCard.technique}
          dueDate={placeCard(postponeCard, today).dueDate}
          onPostpone={(days) => {
            postpone.mutate({ id: postponeCard.id, days });
            setPostponeCard(null);
          }}
          onComplete={() => {
            complete.mutate(postponeCard.id);
            setPostponeCard(null);
          }}
          onClose={() => setPostponeCard(null)}
        />
      )}

      {deleteCard && (
        <ExcluirCardModal
          cardTitle={deleteCard.title}
          archived={deleteCard.archived}
          onConfirm={() => {
            remove.mutate(deleteCard.id);
            setDeleteCard(null);
          }}
          onClose={() => setDeleteCard(null)}
        />
      )}

      {/* Study session: the card's technique picks the guided screen. Pomodoro runs the timer; Active
          Recall / Feynman run their written flows and record the session + attempt; Leitner runs its
          box review; everything else uses the plain session whose "Concluir" completes the card. */}
      {sessionCard &&
        (() => {
          const c = sessionCard;
          const kind = sessionKind(c.technique);
          const close = () => setSessionCard(null);
          if (kind === "pomodoro" && c.pomodoro) {
            return (
              <PomodoroSession
                cardTitle={c.title}
                rhythm={c.pomodoro}
                contentLink={c.content_link || undefined}
                onComplete={(focusedSecs) => {
                  record.mutate({ id: c.id, focusedSecs, selfRating: null });
                  close();
                }}
                onExit={close}
              />
            );
          }
          if (kind === "activeRecall") {
            return (
              <ActiveRecallSession
                cardTitle={c.title}
                contentLink={c.content_link || undefined}
                reviewLink={c.review_link || undefined}
                onFinish={({ focusedSecs, selfRating, text }) => {
                  record.mutate({ id: c.id, focusedSecs, selfRating });
                  if (text) recordAttempt.mutate({ cardId: c.id, kind: "active_recall", text });
                  close();
                }}
                onExit={close}
              />
            );
          }
          if (kind === "feynman") {
            return (
              <FeynmanSession
                cardTitle={c.title}
                contentLink={c.content_link || undefined}
                reviewLink={c.review_link || undefined}
                onFinish={({ focusedSecs, selfRating, text }) => {
                  record.mutate({ id: c.id, focusedSecs, selfRating });
                  if (text) recordAttempt.mutate({ cardId: c.id, kind: "feynman", text });
                  close();
                }}
                onExit={close}
              />
            );
          }
          if (kind === "leitner") {
            return (
              <LeitnerSession
                cardId={c.id}
                cardTitle={c.title}
                onComplete={() => {
                  complete.mutate(c.id);
                  close();
                }}
                onExit={close}
              />
            );
          }
          return (
            <NoneSession
              cardTitle={c.title}
              contentLink={c.content_link || undefined}
              reviewLink={c.review_link || undefined}
              technique={c.technique || undefined}
              onConcluir={() => {
                complete.mutate(c.id);
                close();
              }}
              onExit={close}
            />
          );
        })()}
    </>
  );

  return { open: (card: Card) => setDetailCard(card), study, modals };
}
