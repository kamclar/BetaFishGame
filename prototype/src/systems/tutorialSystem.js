import { csTutorial } from "../i18n/csTutorial.js";

const guideSteps = [
  { id: "welcome", target: ".hud-toggle", completesWith: "continue" },
  { id: "inspect_fish", target: "#aquarium", completesWith: "fishSelected" },
  { id: "feed_fish", target: '[data-action="feed"]', completesWith: "action:feed" },
  { id: "test_water", target: '[data-action="test"]', completesWith: "action:test" },
  { id: "open_journal", target: '[data-action="journal"]', completesWith: "journalOpened", storyAction: "journalFound" },
  { id: "clean_tank", target: '[data-action="clean"]', completesWith: "action:clean", storyAction: "maintenance", phase: "guide", skillXp: 2 },
  { id: "plant_balance", target: '[data-action="shop"]', completesWith: "action:plant", storyAction: "plant", phase: "guide", skillXp: 2 },
  { id: "first_brood", target: '[data-tank="nursery"]', completesWith: "action:breed", phase: "guide", skillXp: 4 },
  { id: "first_sale", target: '[data-action="sales"]', completesWith: "action:sell", phase: "guide", skillXp: 4 },
  { id: "independent", target: "#currentTask", completesWith: "continue", phase: "guide" },
];

export function initializeTutorial(economy) {
  economy.tutorial ??= { step: 0, completed: false, skipped: false };
  // Migrace predchozi rozdelene verze tutorialu a pruvodnich ukolu.
  if (!economy.tutorial.unifiedGuideVersion) {
    if (economy.tutorial.completed) economy.tutorial.step = guideSteps.length - 1;
    else if (economy.tutorial.skipped) economy.tutorial.step = 5;
    else economy.tutorial.step = Math.min(economy.tutorial.step ?? 0, 4);
    economy.tutorial.skipped = false;
    economy.tutorial.unifiedGuideVersion = 1;
  }
  economy.tutorial.step = Math.max(0, Math.min(guideSteps.length - 1, economy.tutorial.step ?? 0));
  return economy.tutorial;
}

export function currentTutorialStep(economy) {
  const state = initializeTutorial(economy);
  if (state.completed) return null;
  const step = guideSteps[state.step];
  return {
    ...step,
    ...csTutorial[step.id],
    progress: csTutorial.progress.replace("{current}", state.step + 1).replace("{total}", guideSteps.length),
    skipLabel: csTutorial.skip,
    canSkip: state.step < 5,
  };
}

export function advanceTutorial(economy, event) {
  const state = initializeTutorial(economy);
  if (state.completed) return false;
  const step = guideSteps[state.step];
  if (step.completesWith !== event) return false;
  if (state.step >= guideSteps.length - 1) state.completed = true;
  else state.step += 1;
  return step;
}

export function skipTutorial(economy) {
  const state = initializeTutorial(economy);
  // Preskoci jen vysvetleni ovladani. Pribehove a chovatelske ukoly zustanou.
  state.step = Math.max(state.step, 5);
}
