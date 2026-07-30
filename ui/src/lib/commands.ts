// Typed command client — thin wrappers over the Tauri `invoke` bridge, one per `core::api` action
// (studdup/src/commands.rs). Argument names are camelCase here; Tauri maps them to the Rust
// snake_case parameters (e.g. `focusedSecs` → `focused_secs`). Return/error types come from the
// hand-kept `bindings.ts`.

import { invoke } from "@tauri-apps/api/core";
import type {
  Attempt,
  AttemptKind,
  Card,
  Exam,
  ExamView,
  HistoryEvent,
  ISODate,
  LeitnerItem,
  Method,
  SessionCursor,
  Technique,
} from "./bindings";

export const commands = {
  createCard(card: Card): Promise<Card> {
    return invoke("create_card", { card });
  },

  editCard(card: Card): Promise<Card> {
    return invoke("edit_card", { card });
  },

  completeCard(id: number): Promise<Card> {
    return invoke("complete_card", { id });
  },

  recordSession(
    id: number,
    focusedSecs: number,
    selfRating: number | null,
  ): Promise<Card> {
    return invoke("record_session", { id, focusedSecs, selfRating });
  },

  postponeCard(id: number, days: number): Promise<Card> {
    return invoke("postpone_card", { id, days });
  },

  restartCard(id: number): Promise<Card> {
    return invoke("restart_card", { id });
  },

  eraseCard(id: number): Promise<Card> {
    return invoke("erase_card", { id });
  },

  reviveCard(id: number): Promise<Card> {
    return invoke("revive_card", { id });
  },

  deleteCard(id: number): Promise<void> {
    return invoke("delete_card", { id });
  },

  createExam(name: string, examDate: ISODate): Promise<Exam> {
    return invoke("create_exam", { name, examDate });
  },

  deleteExam(examId: number): Promise<void> {
    return invoke("delete_exam", { examId });
  },

  listBoard(method: Method): Promise<Card[]> {
    return invoke("list_board", { method });
  },

  listHistory(
    method: Method | null,
    technique: Technique | null,
  ): Promise<HistoryEvent[]> {
    return invoke("list_history", { method, technique });
  },

  listExams(): Promise<ExamView[]> {
    return invoke("list_exams");
  },

  listSessionCursors(): Promise<SessionCursor[]> {
    return invoke("list_session_cursors");
  },

  getSetting(key: string): Promise<string | null> {
    return invoke("get_setting", { key });
  },

  setSetting(key: string, value: string): Promise<void> {
    return invoke("set_setting", { key, value });
  },

  recordAttempt(
    cardId: number,
    kind: AttemptKind,
    text: string,
  ): Promise<Attempt> {
    return invoke("record_attempt", { cardId, kind, text });
  },

  listAttempts(cardId: number): Promise<Attempt[]> {
    return invoke("list_attempts", { cardId });
  },

  addLeitnerItem(
    cardId: number,
    front: string,
    back: string,
  ): Promise<LeitnerItem> {
    return invoke("add_leitner_item", { cardId, front, back });
  },

  listLeitnerItems(cardId: number): Promise<LeitnerItem[]> {
    return invoke("list_leitner_items", { cardId });
  },

  listDueLeitnerItems(cardId: number): Promise<LeitnerItem[]> {
    return invoke("list_due_leitner_items", { cardId });
  },

  reviewLeitnerItem(itemId: number, correct: boolean): Promise<LeitnerItem> {
    return invoke("review_leitner_item", { itemId, correct });
  },
};

export type Commands = typeof commands;
