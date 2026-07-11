import { plantTypes } from "../data/plantData.js";
import { economy } from "./economySystem.js";

export const gameClock = {
  day: 1,
  minute: new Date().getHours() * 60 + new Date().getMinutes(),
  speed: new URLSearchParams(location.search).has("debugTime") ? 60 : 1 / 60,
};

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
    const residents = fish.filter((item) => item.tank === tankId).length;
    const plantList = plants[tankId] ?? [];
    const plantSupport = plantList.reduce((sum, plant) => {
      const type = plantTypes[plant.type];
      plant.age = (plant.age ?? 0) + delta * 0.02;
      return sum + (type?.waterBonus ?? 0) * (0.65 + (plant.condition ?? 0.7) * 0.35);
    }, 0);

    tank.waste = Math.min(1, (tank.waste ?? 0.12) + delta * residents * 0.00018);
    const filterFactor = economy.filterLevel >= 2 ? 0.62 : 1;
    const decay = (0.00007 + tank.waste * 0.00013 + residents * 0.000025) * filterFactor;
    tank.waterQuality = Math.max(0.25, Math.min(1, tank.waterQuality + delta * (plantSupport * 0.018 - decay)));
  }
}

export function applyTankEffects(item, delta, tank) {
  const badWater = Math.max(0, 0.78 - tank.waterQuality);
  const hungerStress = Math.max(0, item.hunger - 72) / 28;
  item.stress = Math.max(0, Math.min(100, item.stress + delta * (badWater * 1.9 + hungerStress * 0.32 - 0.035)));
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
