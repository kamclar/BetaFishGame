import { plantTypes } from "../data/plantData.js";
import { gameMinutesPerRealSecond, simulationSeconds } from "./timeSystem.js";
import { daylightAt } from "./behaviorSystem.js";
import { waterConfig } from "../config/waterConfig.js";
import { fishEnvironmentConfig, hungerConfig } from "../config/fishConfig.js";

export const gameClock = {
  day: 1,
  minute: new Date().getHours() * 60 + new Date().getMinutes(),
  speed: gameMinutesPerRealSecond,
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
    const simDelta = simulationSeconds(delta);
    ensureDirtMaps(tank);
    ensureWaterChemistry(tank);
    const residentFish = fish.filter((item) => item.tank === tankId);
    const residents = residentFish.length;
    tank.lightLevel = daylightAt(gameClock.minute);
    tank.capacity ??= defaultCapacity(tankId);
    tank.bioload = residentFish.reduce((sum, item) => sum + (item.size ?? 1.5) * (item.growthScale ?? 1) * waterConfig.bioload.fishSizeFactor, 0) + (tank.snails ?? 0) * waterConfig.bioload.snail;
    tank.loadRatio = tank.bioload / tank.capacity;
    const plantList = plants[tankId] ?? [];
    const plantSupport = plantList.reduce((sum, plant) => {
      const type = plantTypes[plant.type];
      plant.age = (plant.age ?? 0) + simDelta * waterConfig.plants.ageRate;
      plant.growthStage ??= Math.min(1, 0.16 + plant.age * 0.012);
      plant.condition ??= type?.hardiness ?? 0.7;
      const waterGrowth = Math.max(0.12, Math.min(1.08, (tank.waterQuality - 0.25) / 0.65));
      const availableLight = Math.max(0.04, tank.lightLevel * (tank.lightStrength ?? 1));
      const lightFitness = Math.max(waterConfig.plants.minimumLightFitness, 1 - Math.abs(availableLight - (type?.lightNeed ?? 0.5)) * 1.25);
      const conditionGrowth = 0.35 + plant.condition * 0.65;
      plant.growthStage = Math.min(1, plant.growthStage + simDelta * (type?.growth ?? 0.4) * waterGrowth * lightFitness * conditionGrowth * waterConfig.plants.growthRate);
      const conditionTarget = Math.max(0.18, Math.min(1, tank.waterQuality * 0.72 + lightFitness * 0.2 + (type?.hardiness ?? 0.7) * 0.12));
      plant.condition += (conditionTarget - plant.condition) * Math.min(1, simDelta * waterConfig.plants.conditionRate);
      const sizeSupport = 0.3 + plant.growthStage * 0.7;
      return sum + (type?.waterBonus ?? 0) * sizeSupport * (0.65 + plant.condition * 0.35);
    }, 0);

    const filterFactor = (tank.filterLevel ?? 1) >= 2 ? waterConfig.filter.level2WasteFactor : 1;
    tank.waste = Math.min(1, (tank.waste ?? waterConfig.dirt.initialWaste) + simDelta * residents * waterConfig.dirt.wastePerFishSecond * filterFactor);
    tank.debris = Math.min(1, (tank.debris ?? waterConfig.dirt.initialDebris) + simDelta * residents * waterConfig.dirt.debrisPerFishSecond * filterFactor);
    tank.brownWater = Math.min(1, (tank.brownWater ?? waterConfig.dirt.initialBrownWater) + simDelta * (tank.debris * waterConfig.dirt.brownFromDebris + tank.waste * waterConfig.dirt.brownFromWaste) * filterFactor);
    tank.algae = Math.min(1, (tank.algae ?? waterConfig.dirt.initialAlgae) + simDelta * (waterConfig.dirt.algaeBase + tank.waterQuality * waterConfig.dirt.algaeFromWater));
    tank.algae = Math.max(0, tank.algae - simDelta * (tank.snails ?? 0) * waterConfig.dirt.snailCleaning);
    tank.dirtTick = (tank.dirtTick ?? 0) + simDelta;
    const growthSteps = Math.floor(tank.dirtTick / waterConfig.dirt.mapStepSeconds);
    if (growthSteps > 0) {
      tank.dirtTick %= waterConfig.dirt.mapStepSeconds;
      for (let step = 0; step < growthSteps; step += 1) {
        const algaeIndex = Math.floor(Math.random() * tank.algaeMap.length);
        tank.algaeMap[algaeIndex] = Math.min(1, tank.algaeMap[algaeIndex] + waterConfig.dirt.algaeMapGrowth);
        const debrisIndex = Math.floor(Math.random() * tank.debrisMap.length);
        tank.debrisMap[debrisIndex] = Math.min(1, tank.debrisMap[debrisIndex] + waterConfig.dirt.debrisMapGrowth * Math.max(1, residents / 3) * filterFactor);
      }
    }
    for (let snail = 0; snail < (tank.snails ?? 0); snail += 1) {
      const position = snailPosition(snail, Date.now());
      cleanAlgaeAt(tank, position.x, position.y, delta * 0.012, 0.038, 0.055);
    }
    tank.algae = average(tank.algaeMap);
    tank.debris = average(tank.debrisMap);
    updateHomeostasis(tank, plantList, residents, simDelta);
  }
}

export function applyTankEffects(item, elapsedDays, tank) {
  const waterSensitivity = item.traits.includes("ciziMetabolismus") ? 1.45 : 1;
  const badWater = Math.max(0, fishEnvironmentConfig.waterStressStart - tank.waterQuality) * waterSensitivity;
  const hungerStress = Math.max(0, item.hunger - hungerConfig.stressThreshold) / (100 - hungerConfig.stressThreshold);
  const oxygenStress = Math.max(0, fishEnvironmentConfig.safeOxygen - (tank.oxygen ?? 7)) / 3.2;
  const crowdingStress = Math.max(0, (tank.loadRatio ?? 0) - 1);
  const temperatureStress = Math.max(0, Math.abs((tank.temperature ?? fishEnvironmentConfig.preferredTemperature) - fishEnvironmentConfig.preferredTemperature) - fishEnvironmentConfig.temperatureTolerance) / 5;
  const stress = fishEnvironmentConfig.stressPerDay;
  const recovery = item.traits.includes("echolokacni") ? fishEnvironmentConfig.echolocationRecoveryPerDay : fishEnvironmentConfig.calmRecoveryPerDay;
  item.stress = Math.max(0, Math.min(100, item.stress + elapsedDays * (badWater * stress.water + hungerStress * stress.hunger + oxygenStress * stress.oxygen + crowdingStress * stress.crowding + temperatureStress * stress.temperature - recovery)));
  if (item.hunger > hungerConfig.criticalThreshold || tank.waterQuality < fishEnvironmentConfig.criticalWaterQuality || oxygenStress > 0.55) {
    const loss = fishEnvironmentConfig.healthLossPerDay;
    item.health = Math.max(0, item.health - elapsedDays * (loss.base + badWater * loss.water + oxygenStress * loss.oxygen));
  } else if (item.hunger < hungerConfig.wellFedThreshold && tank.waterQuality > fishEnvironmentConfig.recoveryWaterQuality) {
    item.health = Math.min(100, item.health + elapsedDays * fishEnvironmentConfig.healthRecoveryPerDay);
  }
}

export function cleanTank(tank) {
  ensureWaterChemistry(tank);
  const strength = (tank.filterLevel ?? 1) >= 2 ? 0.78 : 0.62;
  tank.waste = Math.max(0, (tank.waste ?? 0) - strength);
  tank.waterQuality = Math.min(1, tank.waterQuality + ((tank.filterLevel ?? 1) >= 2 ? 0.27 : 0.2));
}

export function vacuumTank(tank, xNormalized = 0.5, strength = 0.08, radius = 0.045) {
  ensureWaterChemistry(tank);
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

export function changeWater(tank, fraction = waterConfig.waterChangeFraction) {
  ensureWaterChemistry(tank);
  const remaining = 1 - Math.max(0.01, Math.min(0.6, fraction));
  tank.ammonia *= remaining;
  tank.nitrite *= remaining;
  tank.nitrate *= remaining;
  tank.waste = Math.max(0, (tank.waste ?? 0) * (0.78 + remaining * 0.12));
  tank.brownWater = Math.max(0, (tank.brownWater ?? 0) * remaining);
  tank.ph += (waterConfig.tapWater.ph - tank.ph) * fraction * 0.65;
  tank.hardness += (waterConfig.tapWater.hardness - tank.hardness) * fraction;
  tank.oxygen += (waterConfig.tapWater.oxygen - tank.oxygen) * fraction * 0.8;
  tank.waterQuality = chemistryQuality(tank);
  return waterTestResult(tank);
}

export function waterTestResult(tank) {
  ensureWaterChemistry(tank);
  return {
    ph: tank.ph.toFixed(1),
    ammonia: tank.ammonia.toFixed(2),
    nitrite: tank.nitrite.toFixed(2),
    nitrate: Math.round(tank.nitrate),
    temperature: tank.temperature.toFixed(1),
    hardness: tank.hardness.toFixed(1),
    oxygen: tank.oxygen.toFixed(1),
    load: Math.round((tank.loadRatio ?? 0) * 100),
    quality: describeWater(tank),
  };
}

export function formatWaterTest(result) {
  return `pH ${result.ph} | NH3 ${result.ammonia} | NO2 ${result.nitrite} | NO3 ${result.nitrate} mg/l | ${result.temperature} C | O2 ${result.oxygen} mg/l | ${result.hardness} dGH | zatez ${result.load} %`;
}

export function formatCompactWaterTest(result) {
  return `pH ${result.ph} · NH3 ${result.ammonia} · NO2 ${result.nitrite} · O2 ${result.oxygen}`;
}

export function waterTestAdvice(result) {
  const warnings = [];
  const safe = waterConfig.safe;
  if (Number(result.ammonia) >= safe.ammonia) warnings.push("amoniak je nebezpecny; omez krmeni, odkal dno a zkontroluj filtr");
  if (Number(result.nitrite) >= safe.nitrite) warnings.push("dusitany jsou nebezpecne; pomuze zabehnuty filtr a castecna vymena vody");
  if (Number(result.nitrate) >= safe.nitrate) warnings.push("dusicnany se hromadi; pridej rostliny nebo vymen cast vody");
  if (Number(result.oxygen) < safe.oxygen) warnings.push("je malo kysliku; sniz osadku nebo zapni vzduchovani");
  if (Number(result.temperature) < safe.temperatureMin || Number(result.temperature) > safe.temperatureMax) warnings.push("teplota je mimo bezpecne rozmezi");
  if (Number(result.hardness) < safe.hardnessMin || Number(result.hardness) > safe.hardnessMax) warnings.push("tvrdost vody je pro beznou nadrz nevhodna");
  if (Number(result.ph) < safe.phMin || Number(result.ph) > safe.phMax) warnings.push("pH je mimo bezne stabilni rozmezi");
  if (Number(result.load) > safe.loadPercent) warnings.push(`nadrz je pretizena na ${result.load} %; presun nebo prodej cast ryb`);
  return warnings.length ? warnings.join("; ") : "Nadrz je v rovnovaze. Sleduj hlavne nocni kyslik a dlouhodoby rust dusicnanu.";
}

export function ensureWaterChemistry(tank) {
  const dirt = Math.max(0, tank.waste ?? 0.1);
  tank.ph ??= waterConfig.defaults.ph - dirt * 0.35;
  tank.ammonia ??= Math.max(0.01, dirt * 0.22);
  tank.nitrite ??= Math.max(0.01, dirt * 0.14);
  tank.nitrate ??= Math.max(4, dirt * 42);
  tank.temperature ??= waterConfig.defaults.temperature;
  tank.hardness ??= waterConfig.defaults.hardness;
  tank.oxygen ??= waterConfig.defaults.oxygen;
  tank.capacity ??= waterConfig.defaults.capacity;
  tank.bioload ??= 0;
  tank.loadRatio ??= 0;
  tank.lightStrength ??= waterConfig.defaults.lightStrength;
  tank.waterQuality = chemistryQuality(tank);
}

function updateHomeostasis(tank, plants, residents, delta) {
  const filterStrength = (tank.filterLevel ?? 1) >= 2 ? waterConfig.filter.level2CycleStrength : 1;
  const biomass = plants.reduce((sum, plant) => sum + (plant.growthStage ?? 0.2) * (plant.condition ?? 0.7), 0);
  const overload = Math.max(1, tank.loadRatio ?? 1);
  const n = waterConfig.nitrogen;
  const ammoniaInput = ((tank.bioload ?? residents) * n.bioloadAmmonia + (tank.waste ?? 0) * n.wasteAmmonia + (tank.debris ?? 0) * n.debrisAmmonia) * delta * overload;
  tank.ammonia = Math.min(n.ammoniaMax, tank.ammonia + ammoniaInput);
  const ammoniaConverted = Math.min(tank.ammonia, delta * n.ammoniaConversion * filterStrength * (0.35 + Math.min(1, tank.waterQuality)));
  tank.ammonia -= ammoniaConverted;
  tank.nitrite = Math.min(n.nitriteMax, tank.nitrite + ammoniaConverted * n.nitriteYield);
  const nitriteConverted = Math.min(tank.nitrite, delta * n.nitriteConversion * filterStrength * (0.35 + Math.min(1, tank.waterQuality)));
  tank.nitrite -= nitriteConverted;
  tank.nitrate = Math.min(n.nitrateMax, tank.nitrate + nitriteConverted * n.nitrateYield);
  const photosynthesis = Math.max(0, (tank.lightLevel ?? 1) * (tank.lightStrength ?? 1));
  const plantUptake = Math.min(tank.nitrate, delta * biomass * n.plantNitrateUptake * photosynthesis);
  tank.nitrate -= plantUptake;
  tank.ammonia = Math.max(0, tank.ammonia - delta * biomass * n.plantAmmoniaUptake);
  const acidityTarget = 7.25 - Math.min(0.65, tank.nitrate / 180) - Math.min(0.25, tank.ammonia * 0.12);
  tank.ph += (acidityTarget - tank.ph) * Math.min(0.002, delta * 0.0000025);
  tank.ph = Math.max(5.8, Math.min(8.4, tank.ph));
  const temperature = waterConfig.temperature;
  const oxygen = waterConfig.oxygen;
  const ambientTemperature = temperature.nightAmbient + (tank.lightLevel ?? 1) * temperature.daylightGain;
  const temperatureTarget = tank.heater ? (tank.heaterSetpoint ?? temperature.heaterSetpoint) : ambientTemperature;
  tank.temperature += (temperatureTarget - tank.temperature) * Math.min(1, delta * (tank.heater ? temperature.heaterRate : temperature.ambientRate));
  const surfaceAeration = ((tank.filterLevel ?? 1) >= 2 ? oxygen.filter2Aeration : oxygen.filter1Aeration) + (tank.aerator ? oxygen.aerator : 0);
  const plantOxygen = photosynthesis > 0.22 ? biomass * photosynthesis * oxygen.plantDayProduction : -biomass * oxygen.plantNightUse;
  const oxygenUse = (tank.bioload ?? residents) * oxygen.fishUse * (1 + Math.max(0, tank.temperature - fishEnvironmentConfig.preferredTemperature) * 0.08);
  tank.oxygen += delta * (surfaceAeration + plantOxygen - oxygenUse);
  tank.oxygen += (oxygen.equilibrium - tank.oxygen) * Math.min(0.0012, delta * 0.0000008);
  tank.oxygen = Math.max(oxygen.min, Math.min(oxygen.max, tank.oxygen));
  tank.waterQuality = chemistryQuality(tank);
}

function chemistryQuality(tank) {
  const ammoniaPenalty = Math.min(1, Math.max(0, tank.ammonia - 0.02) / 0.48);
  const nitritePenalty = Math.min(1, Math.max(0, tank.nitrite - 0.02) / 0.48);
  const nitratePenalty = Math.min(1, Math.max(0, tank.nitrate - 15) / 65);
  const phPenalty = Math.min(1, Math.abs(tank.ph - 7.2) / 1.5);
  const oxygenPenalty = Math.min(1, Math.max(0, 6 - (tank.oxygen ?? 7.5)) / 3);
  const temperaturePenalty = Math.min(1, Math.max(0, Math.abs((tank.temperature ?? 25) - 25) - 1.5) / 5);
  const crowdingPenalty = Math.min(1, Math.max(0, (tank.loadRatio ?? 0) - 1) / 0.8);
  const weight = waterConfig.qualityWeights;
  return Math.max(0.2, Math.min(1, 1 - ammoniaPenalty * weight.ammonia - nitritePenalty * weight.nitrite - nitratePenalty * weight.nitrate - phPenalty * weight.ph - oxygenPenalty * weight.oxygen - temperaturePenalty * weight.temperature - crowdingPenalty * weight.crowding));
}

function defaultCapacity(tankId) {
  return waterConfig.capacities[tankId] ?? waterConfig.capacities.fallback;
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
  if (tank.waterQuality >= waterConfig.qualityBands.excellent) return "Vyborna";
  if (tank.waterQuality >= waterConfig.qualityBands.good) return "Dobra";
  if (tank.waterQuality >= waterConfig.qualityBands.reduced) return "Zhorsena";
  return "Spatna";
}
