export const economy = {
  coins: 36,
  completedTasks: 0,
  filterLevel: 1,
  task: null,
};

const taskTemplates = [
  { id: "feed", label: "Nakrm ryby", target: 2 },
  { id: "test", label: "Otestuj vodu", target: 1 },
  { id: "clean", label: "Vycisti nadrz", target: 1 },
  { id: "plant", label: "Zasad rostlinu", target: 1 },
];

export const actionCosts = {
  feed: 1,
  plant: 8,
  medicine: 6,
  clean: 3,
  test: 0,
};

export function initializeEconomy() {
  if (!economy.task) economy.task = { ...taskTemplates[0], progress: 0 };
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
  onComplete(task);

  const nextIndex = economy.completedTasks % taskTemplates.length;
  economy.task = { ...taskTemplates[nextIndex], progress: 0 };
}

export function taskText() {
  const task = economy.task;
  return `${task.label} ${task.progress}/${task.target}`;
}
