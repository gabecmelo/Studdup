// Quadro route (KAN-01): the kanban board screen. The active method comes from the Zustand store
// (shared with the promoted MethodSwitcher in the shell header, AD-009), so switching the method
// swaps the board. The React Query provider is mounted once at the app root (App.tsx); this screen
// just renders the board for the active method.

import { Board } from "../components/Board";
import { useStore } from "../store";

export function Quadro() {
  const method = useStore((s) => s.activeMethod);
  return <Board method={method} />;
}
