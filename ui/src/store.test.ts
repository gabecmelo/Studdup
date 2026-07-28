import { beforeEach, describe, expect, it } from "vitest";
import { STORE_KEY, useStore } from "./store";

function persisted() {
  const raw = localStorage.getItem(STORE_KEY);
  return raw ? JSON.parse(raw).state : undefined;
}

describe("studdup store", () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState({
      activeMethod: "SpacedRepetition",
      sidebarCollapsed: false,
      session: null,
    });
  });

  it("starts on Spaced Repetition", () => {
    expect(useStore.getState().activeMethod).toBe("SpacedRepetition");
  });

  it("switches the active method and persists it (restored on next launch, METH-02)", () => {
    useStore.getState().setActiveMethod("ExamPrep");
    expect(useStore.getState().activeMethod).toBe("ExamPrep");
    expect(persisted().activeMethod).toBe("ExamPrep");

    // Switching back also persists.
    useStore.getState().setActiveMethod("SpacedRepetition");
    expect(persisted().activeMethod).toBe("SpacedRepetition");
  });

  it("toggles and sets the sidebar collapse preference, persisting it", () => {
    expect(useStore.getState().sidebarCollapsed).toBe(false);
    useStore.getState().toggleSidebar();
    expect(useStore.getState().sidebarCollapsed).toBe(true);
    expect(persisted().sidebarCollapsed).toBe(true);

    useStore.getState().setSidebarCollapsed(false);
    expect(useStore.getState().sidebarCollapsed).toBe(false);
    expect(persisted().sidebarCollapsed).toBe(false);
  });

  it("keeps the live session in memory only (never persisted)", () => {
    useStore
      .getState()
      .startSession({ cardId: 7, technique: "Pomodoro", startedAt: 1000 });
    expect(useStore.getState().session?.cardId).toBe(7);
    // Ephemeral: excluded from the persisted snapshot by `partialize`.
    expect(persisted().session).toBeUndefined();

    useStore.getState().endSession();
    expect(useStore.getState().session).toBeNull();
  });
});
