// T47 — session reminder suppress logic (TECH-07.3): the per-technique settings key and the decision
// that only the exact flag value "1" suppresses the banner.

import { describe, expect, it } from "vitest";
import type { Technique } from "../lib/bindings";
import {
  REMINDER_HOWTO,
  REMINDER_SUPPRESSED,
  isReminderSuppressed,
  reminderStorageKey,
} from "./reminder";

const TECHNIQUES: readonly Technique[] = ["Pomodoro", "ActiveRecall", "Feynman", "Leitner"];

describe("reminderStorageKey", () => {
  it("namespaces the flag per technique as reminder.<technique>.hidden", () => {
    expect(reminderStorageKey("Pomodoro")).toBe("reminder.Pomodoro.hidden");
    expect(reminderStorageKey("ActiveRecall")).toBe("reminder.ActiveRecall.hidden");
    expect(reminderStorageKey("Feynman")).toBe("reminder.Feynman.hidden");
    expect(reminderStorageKey("Leitner")).toBe("reminder.Leitner.hidden");
  });

  it("gives each technique a distinct key", () => {
    const keys = new Set(TECHNIQUES.map(reminderStorageKey));
    expect(keys.size).toBe(TECHNIQUES.length);
  });
});

describe("isReminderSuppressed", () => {
  it("is suppressed only for the exact stored flag value", () => {
    expect(isReminderSuppressed(REMINDER_SUPPRESSED)).toBe(true);
    expect(isReminderSuppressed("1")).toBe(true);
  });

  it("is not suppressed when unset or any other value", () => {
    expect(isReminderSuppressed(null)).toBe(false);
    expect(isReminderSuppressed(undefined)).toBe(false);
    expect(isReminderSuppressed("")).toBe(false);
    expect(isReminderSuppressed("0")).toBe(false);
    expect(isReminderSuppressed("true")).toBe(false);
  });
});

describe("REMINDER_HOWTO", () => {
  it("has a non-empty how-to for all four techniques", () => {
    for (const t of TECHNIQUES) {
      expect(REMINDER_HOWTO[t].length).toBeGreaterThan(0);
    }
  });
});
