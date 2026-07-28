// Typed command client — thin wrappers over the Tauri `invoke` bridge, one per `core::api` action
// (studdup/src/commands.rs). Argument names are camelCase here; Tauri maps them to the Rust
// snake_case parameters (e.g. `focusedSecs` → `focused_secs`). Return/error types come from the
// hand-kept `bindings.ts`.

import { invoke } from "@tauri-apps/api/core";
import type { Card, Exam, HistoryEvent, ISODate, Method, Technique } from "./bindings";

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
};

export type Commands = typeof commands;
