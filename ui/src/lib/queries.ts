// React Query wiring: a shared QueryClient, query keys, and typed query/mutation hooks over the
// command client. Mutations invalidate the board and history caches so the kanban reflects backend
// state after an action. The `QueryClientProvider` is mounted by the board wiring (T22); this
// module stays JSX-free so it keeps its `.ts` extension.

import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Card, Exam, ISODate, Method, Technique } from "./bindings";
import { commands } from "./commands";

/** App-wide query client (single instance). */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: false, // local DB: a failed command is a real error, not a transient network blip
    },
  },
});

export const queryKeys = {
  board: (method: Method) => ["board", method] as const,
  history: (method: Method | null, technique: Technique | null) =>
    ["history", method, technique] as const,
  exams: () => ["exams"] as const,
  sessionCursors: () => ["sessionCursors"] as const,
};

/** All exams as read projections (progress + days-remaining), for the list/detail/rail (EXAM-04). */
export function useExams() {
  return useQuery({
    queryKey: queryKeys.exams(),
    queryFn: () => commands.listExams(),
  });
}

/** Per-card "Sessão N de M" cursors for the Prova board (KAN-04). */
export function useSessionCursors() {
  return useQuery({
    queryKey: queryKeys.sessionCursors(),
    queryFn: () => commands.listSessionCursors(),
  });
}

/** Active cards for a method — the kanban board source (KAN-01). */
export function useBoard(method: Method) {
  return useQuery({
    queryKey: queryKeys.board(method),
    queryFn: () => commands.listBoard(method),
  });
}

/** History events, unified (`method = null`) or scoped, optionally narrowed by technique. */
export function useHistory(
  method: Method | null,
  technique: Technique | null = null,
) {
  return useQuery({
    queryKey: queryKeys.history(method, technique),
    queryFn: () => commands.listHistory(method, technique),
  });
}

/** Invalidate every board + history + exam query after a card/exam mutation. */
function useInvalidateAll() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["board"] }),
      qc.invalidateQueries({ queryKey: ["history"] }),
      qc.invalidateQueries({ queryKey: ["exams"] }),
      qc.invalidateQueries({ queryKey: ["sessionCursors"] }),
    ]);
}

export function useCreateCard() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (card: Card) => commands.createCard(card),
    onSuccess: invalidate,
  });
}

export function useEditCard() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (card: Card) => commands.editCard(card),
    onSuccess: invalidate,
  });
}

export function useCompleteCard() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: number) => commands.completeCard(id),
    onSuccess: invalidate,
  });
}

export function useRecordSession() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (vars: { id: number; focusedSecs: number; selfRating: number | null }) =>
      commands.recordSession(vars.id, vars.focusedSecs, vars.selfRating),
    onSuccess: invalidate,
  });
}

export function usePostponeCard() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (vars: { id: number; days: number }) =>
      commands.postponeCard(vars.id, vars.days),
    onSuccess: invalidate,
  });
}

export function useRestartCard() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: number) => commands.restartCard(id),
    onSuccess: invalidate,
  });
}

export function useEraseCard() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: number) => commands.eraseCard(id),
    onSuccess: invalidate,
  });
}

export function useReviveCard() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: number) => commands.reviveCard(id),
    onSuccess: invalidate,
  });
}

export function useDeleteCard() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: number) => commands.deleteCard(id),
    onSuccess: invalidate,
  });
}

export function useCreateExam() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (vars: { name: string; examDate: ISODate }): Promise<Exam> =>
      commands.createExam(vars.name, vars.examDate),
    onSuccess: invalidate,
  });
}

export function useDeleteExam() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (examId: number) => commands.deleteExam(examId),
    onSuccess: invalidate,
  });
}
