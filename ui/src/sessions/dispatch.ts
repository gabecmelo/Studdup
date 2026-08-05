// Session dispatch (TECH-04/05/08). Maps a card's technique to the guided session screen the board
// should mount. Pure so the mapping is unit-tested independently of the board wiring. Only a card with
// no technique falls back to the plain "none" session; every supported technique has its own screen.

import type { Technique } from "../lib/bindings";

export type SessionKind = "pomodoro" | "activeRecall" | "feynman" | "leitner" | "none";

/** The session screen kind for a card's technique (null → the plain session). */
export function sessionKind(technique: Technique | null): SessionKind {
  switch (technique) {
    case "Pomodoro":
      return "pomodoro";
    case "ActiveRecall":
      return "activeRecall";
    case "Feynman":
      return "feynman";
    case "Leitner":
      return "leitner";
    default:
      // Only a card with no technique uses the plain session.
      return "none";
  }
}
