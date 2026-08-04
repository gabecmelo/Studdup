import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import "./styles/tokens.css";
import { initTheme } from "./styles/theme";
import { AppShell } from "./components/AppShell";
import { queryClient } from "./lib/queries";

// App root: apply the persisted theme, then render the collapsible shell (AD-009) inside the React
// Query provider (T22) so the board and later screens can read command data. Modals and session
// screens plug into the shell's routes in later tasks.
export default function App() {
  useEffect(() => initTheme(), []);
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
