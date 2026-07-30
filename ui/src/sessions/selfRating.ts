// Self-rating scale (TECH-06). The three-point retrieval scale asked at the end of an Active Recall or
// Feynman session — *Não lembrei / Parcial / Sólido* — mapping to the 0/1/2 stored on the history
// event (`record_session(..., self_rating)`). This module is the pure source of the option list and its
// value mapping so it can be unit-tested; the `SelfRating` component renders it.

/** The persisted rating value (lowest = did not remember, highest = solid). */
export type SelfRatingValue = 0 | 1 | 2;

/** Dot tone per rung, matching the session handoff (atraso → accent → revisar). */
export type SelfRatingTone = "atraso" | "accent" | "revisar";

export interface SelfRatingOption {
  value: SelfRatingValue;
  label: string;
  /** One-line consequence hint shown under the label. */
  note: string;
  tone: SelfRatingTone;
}

/** The default three-point scale, in ascending order of retrieval strength. */
export const SELF_RATING: readonly SelfRatingOption[] = [
  { value: 0, label: "Não lembrei", note: "Volta amanhã, cedo na fila.", tone: "atraso" },
  { value: 1, label: "Parcial", note: "Mantém o ritmo atual de revisões.", tone: "accent" },
  { value: 2, label: "Sólido", note: "Espaça mais — próxima revisão mais longe.", tone: "revisar" },
];

/** The valid persisted values, in order. */
export const SELF_RATING_VALUES: readonly SelfRatingValue[] = SELF_RATING.map((o) => o.value);

/** The dot color CSS var for a rung's tone. */
export function selfRatingDot(tone: SelfRatingTone): string {
  return tone === "atraso" ? "var(--atraso-ink)" : tone === "accent" ? "var(--accent)" : "var(--revisar)";
}
