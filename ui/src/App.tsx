import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

// Smoke wiring: exercises the Tauri `invoke` bridge. There is no `ping` command yet
// (commands land in a later phase), so we fall back gracefully when it is absent or
// when running outside a Tauri window (e.g. a plain `vite build` preview).
export default function App() {
  const [status, setStatus] = useState<string>("carregando…");

  useEffect(() => {
    invoke<string>("ping")
      .then((reply) => setStatus(reply))
      .catch(() => setStatus("studdup"));
  }, []);

  return <main>studdup — {status}</main>;
}
