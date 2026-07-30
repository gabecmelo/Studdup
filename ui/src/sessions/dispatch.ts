// Session dispatch (TECH-04/05). Maps a card's technique to the guided session screen the board should
// mount. Pure so the mapping is unit-tested independently of the board wiring. Leitner is intentionally
// left folded into "none" here — its screen (and this mapping's "leitner" arm) ship in T57; every
// no-technique or not-yet-supported card falls back to the plain "none" session.

import type { Technique } from "../lib/bindings";

export type SessionKind = "pomodoro" | "activeRecall" | "feynman" | "none";

/** The session screen kind for a card's technique (null / unsupported → the plain session). */
export function sessionKind(technique: Technique | null): SessionKind {
  switch (technique) {
    case "Pomodoro":
      return "pomodoro";
    case "ActiveRecall":
      return "activeRecall";
    case "Feynman":
      return "feynman";
    default:
      // null (no technique) and Leitner (until T57) both use the plain session for now.
      return "none";
  }
}
