// Exam colour coding (handoff QuadroProva). The Prova board colour-codes each exam so its cards,
// group headings and rail row read as one thread. The handoff cycles four hues (lavender, teal,
// green, rose); we map a stable exam id onto that cycle via the `--exam-1..4` tokens so the same
// exam keeps the same colour across the rail and the board, in both themes.

/** A CSS `var(--exam-N)` colour for an exam, stable per id and cycling through the four hues. */
export function examColor(examId: number): string {
  // A non-negative, stable index; the sentinel -1 (card with no exam) folds onto the first hue.
  const i = ((examId % 4) + 4) % 4;
  return `var(--exam-${i + 1})`;
}
