export const lifeStages = {
  fry: {
    name: "poter",
    minDays: 0,
    scale: 0.42,
    speed: 0.7,
    canBreed: false,
  },
  juvenile: {
    name: "mlada ryba",
    minDays: 7,
    scale: 0.68,
    speed: 0.9,
    canBreed: false,
  },
  youngAdult: {
    name: "dorustajici",
    minDays: 18,
    scale: 0.88,
    speed: 1,
    canBreed: false,
  },
  adult: {
    name: "dospela",
    minDays: 30,
    scale: 1,
    speed: 1,
    canBreed: true,
  },
  old: {
    name: "starsi ryba",
    minDays: 120,
    scale: 0.96,
    speed: 0.86,
    canBreed: false,
  },
};

const stageOrder = ["fry", "juvenile", "youngAdult", "adult", "old"];
const secondsPerLifeDay = new URLSearchParams(location.search).has("debugTime") ? 18 : 86400;

export function updateLifecycle(item, delta, addLog) {
  item.ageDays += delta / secondsPerLifeDay;
  const previousStage = item.lifeStage;
  const stage = getLifeStage(item.ageDays);
  item.lifeStage = stage.id;
  item.stageName = stage.name;
  item.growthScale = stage.scale;
  item.stageSpeed = stage.speed;
  item.canBreedByAge = stage.canBreed;
  item.age = formatAge(item.ageDays);

  if (previousStage && previousStage !== item.lifeStage) {
    addLog(`${item.name}: ${stage.name}.`);
  }
}

export function initializeLifecycle(item) {
  const stage = getLifeStage(item.ageDays);
  item.lifeStage = stage.id;
  item.stageName = stage.name;
  item.growthScale = stage.scale;
  item.stageSpeed = stage.speed;
  item.canBreedByAge = stage.canBreed;
  item.age = formatAge(item.ageDays);
}

export function getLifeStage(ageDays) {
  let current = "fry";
  for (const stageId of stageOrder) {
    if (ageDays >= lifeStages[stageId].minDays) current = stageId;
  }
  return { id: current, ...lifeStages[current] };
}

export function formatAge(ageDays) {
  if (ageDays < 1) return "mene nez den";
  const rounded = Math.floor(ageDays);
  if (rounded === 1) return "1 den";
  if (rounded > 1 && rounded < 5) return `${rounded} dny`;
  return `${rounded} dni`;
}
