// Technique reminder — pure logic for the dismissible how-to banner shown at the top of every study
// session (TECH-07.3). The "não mostrar de novo" control persists a per-technique suppress flag in the
// settings table under `reminder.<technique>.hidden`; the banner treats the value "1" as suppressed.
// Keeping the key derivation and the suppress decision here (JSX-free) makes them unit-testable.

import type { Technique } from "../lib/bindings";

/** Settings key holding the "do not show again" flag for a technique's session reminder. */
export function reminderStorageKey(technique: Technique): string {
  return `reminder.${technique}.hidden`;
}

/** The stored value that means "suppressed" — set by "não mostrar de novo". */
export const REMINDER_SUPPRESSED = "1";

/** Whether a stored setting value suppresses the reminder (only the exact flag value counts). */
export function isReminderSuppressed(value: string | null | undefined): boolean {
  return value === REMINDER_SUPPRESSED;
}

/** A short how-to for applying each technique, shown in the session reminder banner (TECH-07.3). */
export const REMINDER_HOWTO: Record<Technique, string> = {
  Pomodoro:
    "Foco inteiro num bloco só, sem trocar de aba. Quando o relógio zerar, faça a pausa de verdade.",
  ActiveRecall:
    "Escreva tudo que lembra antes de olhar o material — o esforço de puxar da memória é o que fixa.",
  Feynman:
    "Explique em linguagem simples, como pra um iniciante. Onde você travar é exatamente a lacuna a estudar.",
  Leitner:
    "Responda de memória, vire o card e marque certo ou errado com honestidade — o erro traz o item de volta.",
};
