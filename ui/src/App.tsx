import { useEffect } from "react";
import "./styles/tokens.css";
import { initTheme } from "./styles/theme";
import { AppShell } from "./components/AppShell";

// App root: apply the persisted theme, then render the collapsible shell (AD-009). The kanban
// board, modals and session screens plug into the shell's routes in later tasks.
export default function App() {
  useEffect(() => initTheme(), []);
  return <AppShell />;
}
