// Ephemeral UI state (Zustand) — the active study method, the sidebar collapse preference, and the
// live study session. Durable preferences (active method + sidebar) persist to localStorage so the
// method selection is restored on next launch (METH-02); the live session is ephemeral and never
// persisted. Server/command data lives in React Query, not here.

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Method, Technique } from "./lib/bindings";

/** A study session in progress (drives the session screens + the "estudar agora" flow). */
export interface LiveSession {
  cardId: number;
  technique: Technique | null;
  /** Epoch milliseconds when the session started (for elapsed-time accounting). */
  startedAt: number;
}

export interface StuddupState {
  activeMethod: Method;
  setActiveMethod: (method: Method) => void;

  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  session: LiveSession | null;
  startSession: (session: LiveSession) => void;
  endSession: () => void;
}

export const STORE_KEY = "studdup.store";

export const useStore = create<StuddupState>()(
  persist(
    (set) => ({
      activeMethod: "SpacedRepetition",
      setActiveMethod: (method) => set({ activeMethod: method }),

      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      session: null,
      startSession: (session) => set({ session }),
      endSession: () => set({ session: null }),
    }),
    {
      name: STORE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only durable preferences persist; the live session stays in memory.
      partialize: (state) => ({
        activeMethod: state.activeMethod,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);
