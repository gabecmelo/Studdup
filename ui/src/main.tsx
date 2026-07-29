import React from "react";
import ReactDOM from "react-dom/client";
// Bundled fonts (offline app — no Google Fonts fetch): Outfit (variable, all weights) for the
// interface + titles, DM Mono for numbers/dates/timers, matching the Claude Design handoff.
import "@fontsource-variable/outfit";
import "@fontsource/dm-mono/400.css";
import "@fontsource/dm-mono/500.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
