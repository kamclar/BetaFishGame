export const economy = {
  coins: 36,
  completedTasks: 0,
  filterLevel: 1,
  task: null,
  supplies: { food: 12 },
};

const taskTemplates = [
  { id: "feed", label: "Nakrm ryby", target: 2, reward: 6 },
  { id: "test", label: "Otestuj vodu", target: 1, reward: 4 },
  { id: "clean", label: "Vycisti nadrz", target: 1, reward: 9 },
  { id: "plant", label: "Zasad rostlinu", target: 1, reward: 14 },
  { id: "breed", label: "Nech ryby naklast jikry", target: 1, reward: 24 },
  { id: "sell", label: "Prodej rybu zakaznikovi", target: 1, reward: 18 },
];

export const actionCosts = {
  feed: 0,
  foodPack: 10,
  plant: 8,
  medicine: 6,
  clean: 0,
  test: 0,
  scrape: 0,
  snail: 45,
  eggs: 28,
};

export function initializeEconomy() {
  economy.supplies ??= {};
  economy.supplies.food ??= 12;
  if (!economy.task) {
    economy.task = { ...taskTemplates[0], progress: 0 };
    return;
  }
  const template = taskTemplates.find((item) => item.id === economy.task.id);
  if (template) economy.task = { ...economy.task, ...template, progress: economy.task.progress ?? 0 };
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
  const task = economy.task;
  if (!task || task.id !== action) return;
  task.progress = Math.min(task.target, task.progress + 1);
  if (task.progress < task.target) return;

  economy.completedTasks += 1;
  economy.coins += task.reward ?? 0;
  onComplete(task);

  const nextIndex = economy.completedTasks % taskTemplates.length;
  economy.task = { ...taskTemplates[nextIndex], progress: 0 };
}

export function taskText() {
  const task = economy.task;
  return `${task.label} ${task.progress}/${task.target} · +${task.reward ?? 0} penez`;
}
