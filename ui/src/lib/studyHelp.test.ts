import { describe, expect, it } from "vitest";
import { METHOD_HELP, TECHNIQUE_HELP, type HelpTopic } from "./studyHelp";

function assertUsable(topic: HelpTopic) {
  expect(topic.title.trim().length).toBeGreaterThan(0);
  expect(topic.intro.trim().length).toBeGreaterThan(0);
  expect(topic.steps.length).toBeGreaterThanOrEqual(3);
  topic.steps.forEach((s) => expect(s.trim().length).toBeGreaterThan(0));
}

describe("study help content (how-to-use-in-app)", () => {
  it("covers both methods and all four techniques", () => {
    expect(Object.keys(METHOD_HELP).sort()).toEqual(["ExamPrep", "SpacedRepetition"]);
    expect(Object.keys(TECHNIQUE_HELP).sort()).toEqual([
      "ActiveRecall",
      "Feynman",
      "Leitner",
      "Pomodoro",
    ]);
  });

  it("gives every method a non-empty, multi-step topic", () => {
    Object.values(METHOD_HELP).forEach(assertUsable);
  });

  it("gives every technique a non-empty, multi-step topic", () => {
    Object.values(TECHNIQUE_HELP).forEach(assertUsable);
  });
});
