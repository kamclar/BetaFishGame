import { csStoryChapters } from "../i18n/csStory.js";

const ignoredStoryFish = new Set(["eldritch-preview-stage-4"]);
const unlockRules = {
  inheritance: () => true,
  first_test: ({ story }) => (story.tests ?? 0) > 0,
  balance: ({ tanks, plants, fish }) => Object.entries(tanks).some(([id, tank]) => {
    const residents = fish.filter((item) => item.tank === id).length;
    return residents > 0 && (plants[id]?.length ?? 0) >= 3 && tank.ammonia < 0.05 && tank.nitrite < 0.05
      && tank.nitrate < 25 && tank.ph >= 6.7 && tank.ph <= 7.7 && tank.oxygen >= 6.5
      && tank.temperature >= 23 && tank.temperature <= 27 && tank.loadRatio <= 1;
  }),
  first_brood: ({ fish }) => storyFish(fish).some((item) => (item.parents?.length ?? 0) === 2),
  close_line: ({ fish }) => storyFish(fish).some((item) => (item.geneticHealth?.inbreedingCoefficient ?? 0) >= 0.125 || item.traits?.includes("krehkaLinie")),
  pond_fish: ({ fish }) => storyFish(fish).some((item) => (item.eldritchStage ?? 0) >= 1),
  night_watch: ({ fish }) => storyFish(fish).some((item) => (item.eldritchStage ?? 0) >= 2),
  wrong_clutch: ({ fish }) => storyFish(fish).some((item) => (item.eldritchStage ?? 0) >= 3),
  last_page: ({ fish }) => storyFish(fish).some((item) => (item.eldritchStage ?? 0) >= 4 && (item.parents?.length ?? 0) === 2),
};

export function initializeStory(economy) {
  economy.story ??= { unlocked: [], tests: 0, waterChanges: 0 };
  economy.story.unlocked ??= []; economy.story.tests ??= 0; economy.story.waterChanges ??= 0;
}
export function recordStoryAction(economy, action) {
  initializeStory(economy);
  if (action === "test") economy.story.tests += 1;
  if (action === "waterChange") economy.story.waterChanges += 1;
}
export function updateStory(economy, context) {
  initializeStory(economy); const newlyUnlocked = [];
  for (const chapter of csStoryChapters) {
    if (economy.story.unlocked.includes(chapter.id)) continue;
    if (unlockRules[chapter.id]?.({ ...context, story: economy.story })) {
      economy.story.unlocked.push(chapter.id); newlyUnlocked.push(chapter);
    }
  }
  return newlyUnlocked;
}
export function storyChapters(economy) {
  initializeStory(economy);
  return csStoryChapters.map((chapter) => ({ ...chapter, unlocked: economy.story.unlocked.includes(chapter.id) }));
}
function storyFish(fish) { return fish.filter((item) => !ignoredStoryFish.has(item.id)); }
