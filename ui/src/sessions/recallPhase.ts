// Active Recall phase logic (TECH-04). The retrieval-gating invariant lives here as pure logic so it
// is testable rather than buried in JSX: the source material (content/review links) is revealed ONLY
// after the user submits their written recall — never while they are still writing from memory
// (TECH-04.1). The session component routes its link rendering through `isSourceRevealed` so this one
// predicate is the single source of truth for the reveal.
//
// (Named `recallPhase`, not `activeRecall`, to avoid a case-only filename collision with the
// `ActiveRecall.tsx` component on case-insensitive filesystems.)

export type ActiveRecallPhase = "write" | "compare" | "rate";

/**
 * Whether the source material may be shown in this phase. `false` during "write" (the whole point of
 * retrieval practice is to recall without the source), `true` once the user has submitted and reached
 * "compare"/"rate" (TECH-04.1).
 */
export function isSourceRevealed(phase: ActiveRecallPhase): boolean {
  return phase !== "write";
}
