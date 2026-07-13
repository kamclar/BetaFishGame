import { plantTypes } from "../data/plantData.js";
import { economy } from "./economySystem.js";

export const gameClock = {
  day: 1,
  minute: new Date().getHours() * 60 + new Date().getMinutes(),
  speed: new URLSearchParams(location.search).has("debugTime") ? 60 : 1 / 60,
};
const environmentRate = new URLSearchParams(location.search).has("debugTime") ? 40 : 1;

let lastLoggedDay = 1;

export function updateWorld(delta, tanks, plants, fish, onNewDay) {
  gameClock.minute += delta * gameClock.speed;
  while (gameClock.minute >= 24 * 60) {
    gameClock.minute -= 24 * 60;
    gameClock.day += 1;
  }

  if (gameClock.day !== lastLoggedDay) {
    lastLoggedDay = gameClock.day;
    onNewDay(gameClock.day);
  }

  for (const [tankId, tank] of Object.entries(tanks)) {
    const simDelta = delta * environmentRate;
    ensureDirtMaps(tank);
    const residents = fish.filter((item) => item.tank === tankId).length;
    const plantList = plants[tankId] ?? [];
    const plantSupport = plantList.reduce((sum, plant) => {
      const type = plantTypes[plant.type];
      plant.age = (plant.age ?? 0) + simDelta * 0.02;
      return sum + (type?.waterBonus ?? 0) * (0.65 + (plant.condition ?? 0.7) * 0.35);
    }, 0);

    tank.waste = Math.min(1, (tank.waste ?? 0.12) + simDelta * residents * 0.00018);
    tank.debris = Math.min(1, (tank.debris ?? 0.08) + simDelta * residents * 0.0000002);
    tank.brownWater = Math.min(1, (tank.brownWater ?? 0.04) + simDelta * (tank.debris * 0.0000005 + tank.waste * 0.00000025));
    tank.algae = Math.min(1, (tank.algae ?? 0.06) + simDelta * (0.00000075 + tank.waterQuality * 0.00000025));
    tank.algae = Math.max(0, tank.algae - simDelta * (tank.snails ?? 0) * 0.000055);
    tank.dirtTick = (tank.dirtTick ?? 0) + simDelta;
    const growthSteps = Math.floor(tank.dirtTick / 900);
    if (growthSteps > 0) {
      tank.dirtTick %= 900;
      for (let step = 0; step < growthSteps; step += 1) {
        const algaeIndex = Math.floor(Math.random() * tank.algaeMap.length);
        tank.algaeMap[algaeIndex] = Math.min(1, tank.algaeMap[algaeIndex] + 0.018);
        const debrisIndex = Math.floor(Math.random() * tank.debrisMap.length);
        tank.debrisMap[debrisIndex] = Math.min(1, tank.debrisMap[debrisIndex] + 0.006 * Math.max(1, residents / 3));
      }
    }
    for (let snail = 0; snail < (tank.snails ?? 0); snail += 1) {
      const position = snailPosition(snail, Date.now());
      cleanAlgaeAt(tank, position.x, position.y, delta * 0.012, 0.038, 0.055);
    }
    tank.algae = average(tank.algaeMap);
    tank.debris = average(tank.debrisMap);
    const filterFactor = economy.filterLevel >= 2 ? 0.62 : 1;
    const decay = (0.00007 + tank.waste * 0.00013 + tank.debris * 0.00012 + tank.brownWater * 0.00015 + residents * 0.000025) * filterFactor;
    tank.waterQuality = Math.max(0.25, Math.min(1, tank.waterQuality + simDelta * (plantSupport * 0.018 - decay)));
  }
}

export function applyTankEffects(item, delta, tank) {
  const waterSensitivity = item.traits.includes("ciziMetabolismus") ? 1.45 : 1;
  const badWater = Math.max(0, 0.78 - tank.waterQuality) * waterSensitivity;
  const hungerStress = Math.max(0, item.hunger - 72) / 28;
  const calmRecovery = item.traits.includes("echolokacni") ? 0.06 : 0.035;
  item.stress = Math.max(0, Math.min(100, item.stress + delta * (badWater * 1.9 + hungerStress * 0.32 - calmRecovery)));
  if (item.hunger > 92 || tank.waterQuality < 0.55) {
    item.health = Math.max(0, item.health - delta * (0.12 + badWater * 0.45));
  } else if (item.hunger < 55 && tank.waterQuality > 0.86) {
    item.health = Math.min(100, item.health + delta * 0.025);
  }
}

export function cleanTank(tank) {
  const strength = economy.filterLevel >= 2 ? 0.78 : 0.62;
  tank.waste = Math.max(0, (tank.waste ?? 0) - strength);
  tank.waterQuality = Math.min(1, tank.waterQuality + (economy.filterLevel >= 2 ? 0.27 : 0.2));
}

export function vacuumTank(tank, xNormalized = 0.5, strength = 0.08, radius = 0.045) {
  ensureDirtMaps(tank);
  tank.debrisMap.forEach((value, index) => {
    const x = (index + 0.5) / tank.debrisMap.length;
    const influence = Math.max(0, 1 - Math.abs(x - xNormalized) / radius);
    tank.debrisMap[index] = Math.max(0, value - strength * influence);
  });
  tank.debris = average(tank.debrisMap);
  tank.brownWater = Math.max(0, (tank.brownWater ?? 0) - strength * 0.45);
  tank.waste = Math.max(0, (tank.waste ?? 0) - strength * 0.35);
  tank.waterQuality = Math.min(1, tank.waterQuality + strength * 0.08);
}

export function scrapeAlgae(tank, xNormalized = 0.5, yNormalized = 0.5, strength = 0.11, width = 0.055) {
  ensureDirtMaps(tank);
  cleanAlgaeAt(tank, xNormalized, yNormalized, strength, width, 0.12);
  tank.algae = average(tank.algaeMap);
}

function cleanAlgaeAt(tank, xNormalized, yNormalized, strength, width, height) {
  const columns = 32, rows = 18;
  tank.algaeMap.forEach((value, index) => {
    const x = (index % columns + 0.5) / columns;
    const y = (Math.floor(index / columns) + 0.5) / rows;
    const influenceX = Math.max(0, 1 - Math.abs(x - xNormalized) / width);
    const influenceY = Math.max(0, 1 - Math.abs(y - yNormalized) / height);
    tank.algaeMap[index] = Math.max(0, value - strength * influenceX * influenceY);
  });
}

export function snailPosition(index, timeMs) {
  const time = timeMs / 165000 + index * 2.71;
  return {
    x: 0.5 + Math.sin(time * 0.73) * 0.31 + Math.sin(time * 1.91 + 1.4) * 0.125 + Math.sin(time * 0.21) * 0.065,
    y: 0.5 + Math.sin(time * 0.51 + 0.8) * 0.285 + Math.sin(time * 1.37) * 0.15 + Math.cos(time * 0.17) * 0.065,
  };
}

function ensureDirtMaps(tank) {
  if (!Array.isArray(tank.algaeMap) || tank.algaeMap.length !== 32 * 18) {
    const level = tank.algae ?? 0.06;
    tank.algaeMap = Array.from({ length: 32 * 18 }, (_, i) => Math.max(0, Math.min(1, level * (0.72 + ((i * 37) % 29) / 50))));
  }
  if (!Array.isArray(tank.debrisMap) || tank.debrisMap.length !== 40) {
    const level = tank.debris ?? 0.08;
    tank.debrisMap = Array.from({ length: 40 }, (_, i) => Math.max(0, Math.min(1, level * (0.75 + ((i * 17) % 23) / 38))));
  }
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function formatGameTime() {
  const hour = Math.floor(gameClock.minute / 60);
  const minute = Math.floor(gameClock.minute % 60);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function describeWater(tank) {
  if (tank.waterQuality >= 0.9) return "Vyborna";
  if (tank.waterQuality >= 0.75) return "Dobra";
  if (tank.waterQuality >= 0.58) return "Zhorsena";
  return "Spatna";
}
