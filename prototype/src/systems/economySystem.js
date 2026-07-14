import { actionCosts, dailyGoalCount, dailyGoalOffsets, dailyGoalTemplates, economyDefaults, shopUnlocks, skillRanks, supplyPackSizes } from "../config/economyConfig.js";
export { actionCosts, shopUnlocks } from "../config/economyConfig.js";

export const economy = structuredClone(economyDefaults);

export function initializeEconomy(day = 1) {
  economy.supplies ??= {};
  economy.supplies.food ??= supplyPackSizes.food;
  economy.skillXp ??= economy.reputation ?? 0;
  economy.completedTasks ??= 0;
  ensureDailyGoals(day);
}

export function ensureDailyGoals(day) {
  if (economy.goalDay === day && Array.isArray(economy.dailyGoals) && economy.dailyGoals.length === dailyGoalCount) return false;
  const first = (Math.max(1, day) - 1) % dailyGoalTemplates.length;
  const indices = dailyGoalOffsets.map((offset) => (first + offset) % dailyGoalTemplates.length);
  economy.dailyGoals = indices.map((index) => ({ ...dailyGoalTemplates[index], progress: 0, completed: false }));
  economy.goalDay = day;
  return true;
}

export function supplyCount(id) {
  return Math.max(0, economy.supplies?.[id] ?? 0);
}

export function consumeSupply(id, amount = 1) {
  if (supplyCount(id) < amount) return false;
  economy.supplies[id] -= amount;
  return true;
}

export function addSupply(id, amount) {
  economy.supplies ??= {};
  economy.supplies[id] = supplyCount(id) + amount;
}

export function canAfford(action) {
  return economy.coins >= (actionCosts[action] ?? 0);
}

export function payForAction(action) {
  const cost = actionCosts[action] ?? 0;
  if (economy.coins < cost) return false;
  economy.coins -= cost;
  return true;
}

export function recordAction(action, onComplete) {
  for (const task of economy.dailyGoals ?? []) {
    if (task.completed || task.id !== action) continue;
    task.progress = Math.min(task.target, task.progress + 1);
    if (task.progress < task.target) continue;
    task.completed = true;
    economy.completedTasks += 1;
    economy.coins += task.reward ?? 0;
    const skillChange = addSkillExperience(task.skillXp ?? task.reputation ?? 0);
    onComplete(task, skillChange);
  }
}

export function taskText() {
  const goals = economy.dailyGoals ?? [];
  const completed = goals.filter((goal) => goal.completed).length;
  const next = goals.find((goal) => !goal.completed);
  return next
    ? `Cile ${completed}/${dailyGoalCount} · ${next.label} ${next.progress}/${next.target}`
    : `Denni cile ${dailyGoalCount}/${dailyGoalCount} splneny`;
}

export function addSkillExperience(amount) {
  const previous = skillInfo();
  economy.skillXp = Math.max(0, (economy.skillXp ?? 0) + amount);
  const current = skillInfo();
  return { amount, previous, current, leveledUp: current.name !== previous.name };
}

export function skillInfo() {
  const value = economy.skillXp ?? 0;
  let rank = skillRanks[0];
  for (const candidate of skillRanks) if (value >= candidate.min) rank = candidate;
  const rankIndex = skillRanks.indexOf(rank);
  const next = skillRanks[rankIndex + 1] ?? null;
  return { value, name: rank.name, nextAt: next?.min ?? null };
}

export function isShopUnlocked(id) {
  return (economy.skillXp ?? 0) >= (shopUnlocks[id] ?? 0);
}
