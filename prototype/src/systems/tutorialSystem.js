import { csTutorial } from "../i18n/csTutorial.js";

const tutorialSteps = [
  { id: "welcome", target: ".hud-toggle", completesWith: "continue" },
  { id: "inspect_fish", target: "#aquarium", completesWith: "fishSelected" },
  { id: "feed_fish", target: '[data-action="feed"]', completesWith: "action:feed" },
  { id: "test_water", target: '[data-action="test"]', completesWith: "action:test" },
  { id: "read_test", target: "#waterReadings", completesWith: "continue", opensHud: true },
  { id: "open_journal", target: '[data-action="journal"]', completesWith: "journalOpened" },
  { id: "finished", target: ".journal-panel", completesWith: "continue" },
];

export function initializeTutorial(economy) {
  economy.tutorial ??= { step: 0, completed: false, skipped: false };
  economy.tutorial.step = Math.max(0, Math.min(tutorialSteps.length - 1, economy.tutorial.step ?? 0));
  return economy.tutorial;
}

export function currentTutorialStep(economy) {
  const state = initializeTutorial(economy);
  if (state.completed || state.skipped) return null;
  const step = tutorialSteps[state.step];
  return {
    ...step,
    ...csTutorial[step.id],
    progress: csTutorial.progress.replace("{current}", state.step + 1).replace("{total}", tutorialSteps.length),
    skipLabel: csTutorial.skip,
  };
}

export function advanceTutorial(economy, event) {
  const state = initializeTutorial(economy);
  if (state.completed || state.skipped) return false;
  const step = tutorialSteps[state.step];
  if (step.completesWith !== event) return false;
  if (state.step >= tutorialSteps.length - 1) state.completed = true;
  else state.step += 1;
  return true;
}

export function skipTutorial(economy) {
  const state = initializeTutorial(economy);
  state.skipped = true;
}
