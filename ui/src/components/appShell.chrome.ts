// The pure viewport → navigation-chrome mapping for the app shell (RWD-05/06/07). Kept separate
// from AppShell so the branching is unit-testable without rendering: desktop keeps the full
// sidebar, tablet uses the collapsed icon rail (AD-009), phone uses the bottom tab bar.

import type { Viewport } from "../lib/useViewport";

export type Chrome = "sidebar" | "rail" | "bottombar";

/** Which navigation chrome a viewport gets: phone → bottombar, tablet → rail, desktop → sidebar. */
export function chromeFor(viewport: Viewport): Chrome {
  switch (viewport) {
    case "phone":
      return "bottombar";
    case "tablet":
      return "rail";
    case "desktop":
      return "sidebar";
  }
}
