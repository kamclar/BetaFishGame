import { storyDiscoveryConfig } from "../config/storyConfig.js";
import { csStoryChapters } from "../i18n/csStory.js";

const ignoredStoryFish = new Set(["eldritch-preview-stage-4"]);

export function initializeStory(economy) {
  economy.story ??= { unlocked: [], tests: 0, waterChanges: 0, milestones: {}, randomChecks: {} };
  economy.story.unlocked ??= [];
  economy.story.tests ??= 0;
  economy.story.waterChanges ??= 0;
  economy.story.milestones ??= {};
  economy.story.randomChecks ??= {};
}

export function recordStoryAction(economy, action) {
  initializeStory(economy);
  if (action === "test") economy.story.tests += 1;
  if (action === "waterChange") economy.story.waterChanges += 1;
  if (["journalFound", "maintenance", "plant", "brood"].includes(action)) economy.story.milestones[action] = true;
}

export function updateStory(economy, context) {
  initializeStory(economy);
  const newlyUnlocked = [];
  const normalRules = {
    inheritance: () => economy.story.milestones.journalFound,
    first_test: () => economy.story.milestones.maintenance && economy.story.tests > 0,
    balance: () => economy.story.milestones.plant && hasBalancedPlantedTank(context),
    first_brood: () => economy.story.milestones.brood,
    close_line: () => (economy.skillXp ?? 0) >= storyDiscoveryConfig.closeLineMinimumSkillXp
      && storyFish(context.fish).some((item) => (item.geneticHealth?.inbreedingCoefficient ?? 0) >= 0.125 || item.traits?.includes("krehkaLinie")),
  };

  for (const chapter of csStoryChapters) {
    if (economy.story.unlocked.includes(chapter.id)) continue;
    const normalRule = normalRules[chapter.id];
    const unlocked = normalRule ? normalRule() : tryRandomEldritchDiscovery(chapter.id, economy, context);
    if (!unlocked) continue;
    economy.story.unlocked.push(chapter.id);
    newlyUnlocked.push(chapter);
  }
  return newlyUnlocked;
}

export function storyChapters(economy) {
  initializeStory(economy);
  return csStoryChapters.map((chapter) => ({ ...chapter, unlocked: economy.story.unlocked.includes(chapter.id) }));
}

function hasBalancedPlantedTank({ tanks, plants, fish }) {
  return Object.entries(tanks).some(([id, tank]) => {
    const residents = fish.filter((item) => item.tank === id).length;
    return residents > 0 && (plants[id]?.length ?? 0) >= 3 && tank.ammonia < 0.05 && tank.nitrite < 0.05
      && tank.nitrate < 25 && tank.ph >= 6.7 && tank.ph <= 7.7 && tank.oxygen >= 6.5
      && tank.temperature >= 23 && tank.temperature <= 27 && tank.loadRatio <= 1;
  });
}

function tryRandomEldritchDiscovery(chapterId, economy, context) {
  const config = storyDiscoveryConfig.eldritch[chapterId];
  if (!config || (economy.skillXp ?? 0) < config.minimumSkillXp) return false;
  const sequence = Object.keys(storyDiscoveryConfig.eldritch);
  const sequenceIndex = sequence.indexOf(chapterId);
  if (sequenceIndex > 0 && !economy.story.unlocked.includes(sequence[sequenceIndex - 1])) return false;
  const candidates = storyFish(context.fish).filter((item) => (item.eldritchStage ?? 0) >= config.stage);
  if (!candidates.length) return false;
  if (config.requiresBrood && !candidates.some((item) => (item.parents?.length ?? 0) === 2)) return false;
  const minute = context.gameClock?.minute ?? 720;
  if (config.nightOnly && minute >= 300 && minute < 1260) return false;
  const day = Math.max(1, Math.floor(context.gameClock?.day ?? 1));
  const lastDiscoveryDay = economy.story.lastEldritchDiscoveryDay ?? -Infinity;
  if (day - lastDiscoveryDay < storyDiscoveryConfig.minimumDaysBetweenEldritchPages) return false;
  if (economy.story.randomChecks[chapterId] === day) return false;
  economy.story.randomChecks[chapterId] = day;
  const discovered = Math.random() < config.chancePerDay;
  if (discovered) economy.story.lastEldritchDiscoveryDay = day;
  return discovered;
}

function storyFish(fish) { return fish.filter((item) => !ignoredStoryFish.has(item.id)); }
