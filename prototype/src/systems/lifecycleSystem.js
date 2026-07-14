import { gameDaysElapsed } from "./timeSystem.js";
import { lifeStageOrder, lifeStages } from "../config/fishConfig.js";

export { lifeStages } from "../config/fishConfig.js";
export function updateLifecycle(item, delta, addLog) {
  item.ageDays += gameDaysElapsed(delta);
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
  for (const stageId of lifeStageOrder) {
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
