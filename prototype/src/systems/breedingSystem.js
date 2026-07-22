import { speciesCatalog } from "../data/speciesData.js";
import { applyEldritchLineage } from "./eldritchSystem.js";
import { inheritFishGenes, initializeFishGenes } from "./lineageSystem.js";
import { gameDaysElapsed } from "./timeSystem.js";
import { breedingConfig } from "../config/breedingConfig.js";
import { assignOffspringGeneticHealth, initializeGeneticHealth } from "./pedigreeSystem.js";
import { pedigreeConfig } from "../config/geneticsConfig.js";

export function initializeBreeding(fish) {
  fish.forEach((item, index) => {
    item.sex ??= index % 2 ? "samec" : "samice";
    item.parents ??= [];
    item.offspring ??= [];
    initializeFishGenes(item);
  });
}

export function findMate(parent, fish) {
  if (!parent.canBreed) return null;
  return fish.find((item) => item.id !== parent.id && item.tank === parent.tank && item.sex !== parent.sex && item.canBreed && item.health >= 72 && item.stress < 45) ?? null;
}

export function updateSpawning(delta, tank, fish, onEggs, onHatch, context = {}) {
  const elapsedDays = gameDaysElapsed(delta);
  ensureSpawningClock(tank);
  const state = tank.spawning;
  state.cooldown = Math.max(0, state.cooldown - elapsedDays);
  const parents = fish.filter((item) => item.tank === "nursery" && item.canBreed && item.health >= breedingConfig.minimumHealth && item.stress < breedingConfig.maximumStress && item.diseases.length === 0 && (item.geneticHealth?.fertility ?? 100) >= pedigreeConfig.minimumBreedingFertility);
  const pair = parents.length === 2 && parents[0].sex !== parents[1].sex ? parents : null;

  if (!state.eggs && pair && state.cooldown <= 0) {
    state.courtship += elapsedDays;
    if (state.courtship >= breedingConfig.courtshipDays) {
      state.eggs = { parentIds: pair.map((item) => item.id), age: 0, count: randomClutchSize(pair), kind: "natural" };
      state.courtship = 0;
      onEggs(pair);
    }
  } else if (!state.eggs) {
    state.courtship = 0;
  }

  if (!state.eggs) return;
  state.eggs.age += elapsedDays;
  if (state.eggs.age < breedingConfig.incubationDays) return;
  const eggParents = (state.eggs.parentIds ?? []).map((id) => fish.find((item) => item.id === id)).filter(Boolean);
  if (state.eggs.kind === "shop") onHatch(hatchMysteryEggs(state.eggs.count, fish), []);
  else if (eggParents.length === 2) onHatch(breedPair(eggParents[0], eggParents[1], fish, state.eggs.count, context), eggParents);
  state.eggs = null;
  state.cooldown = breedingConfig.cooldownDays;
}

export function breedPair(a, b, fish, count = 2, context = {}) {
  return Array.from({ length: count }, (_, index) => {
    const purebred = a.species === b.species;
    const id = `f${Date.now()}-${index}`;
    const baby = {
      id, name: breedingConfig.babyNames[Math.floor(Math.random() * breedingConfig.babyNames.length)],
      species: a.species === b.species ? a.species : `${a.species} × ${b.species}`,
      category: purebred ? (a.category ?? b.category) : "hybrid",
      rarity: Math.random() < (purebred ? breedingConfig.rareChancePurebred : breedingConfig.rareChanceHybrid) ? "Rare" : "Common",
      age: "mene nez den", ageDays: 0, health: Math.round((a.health + b.health) / 2), stress: breedingConfig.babyStress, hunger: breedingConfig.babyHunger,
      healthNote: "Mlady poter potrebuje klidnou a cistou vodu.", symptoms: [], diseases: [],
      history: [`Vylihnut ve treci nadrzi. Rodice: ${a.name} a ${b.name}.`],
      traits: inheritTraits(a.traits, b.traits),
      parents: [a.id, b.id], offspring: [], sex: Math.random() < 0.5 ? "samice" : "samec",
      tank: "nursery", x: 320 + index * 130, y: 270 + index * 50, speed: 32, dir: index ? -1 : 1, size: breedingConfig.babySize,
      specialSprite: purebred ? (a.specialSprite ?? b.specialSprite) : null,
      genetics: {}, phase: Math.random() * 5,
    };
    inheritFishGenes(baby, a, b);
    assignOffspringGeneticHealth(baby, a, b, context.pedigreeArchive);
    if (Math.random() < breedingConfig.colorMutationChance) {
      const mutation = breedingConfig.inheritableColors[Math.floor(Math.random() * breedingConfig.inheritableColors.length)];
      const pigmentKey = ["color", "patternColor", "accentColor"][Math.floor(Math.random() * 3)];
      baby.genotype[pigmentKey][Math.floor(Math.random() * 2)] = mutation;
      baby[pigmentKey] = mutation;
      baby.history.push(`Objevila se nova barevna mutace pigmentu: ${mutation}.`);
    }
    applyEldritchLineage(baby, a, b, context);
    fish.push(baby); a.offspring.push(id); b.offspring.push(id);
    return baby;
  });
}

export function addMysteryEggs(tank) {
  ensureSpawningClock(tank);
  if (tank.spawning.eggs) return false;
  tank.spawning.eggs = { parentIds: [], age: 0, count: randomClutchSize(), kind: "shop" };
  return true;
}

function ensureSpawningClock(tank) {
  tank.spawning ??= { courtship: 0, eggs: null, cooldown: 0, timeUnit: "days" };
  if (tank.spawning.timeUnit === "days") return;
  tank.spawning.courtship = Math.min(0.24, (tank.spawning.courtship ?? 0) / 86400);
  tank.spawning.cooldown = Math.min(breedingConfig.cooldownDays, (tank.spawning.cooldown ?? 0) / 86400);
  if (tank.spawning.eggs) tank.spawning.eggs.age = (tank.spawning.eggs.age ?? 0) / 86400;
  tank.spawning.timeUnit = "days";
}

function randomClutchSize(pair = null) {
  let maximum = breedingConfig.clutchMax;
  if (pair) {
    const fertility = pair.reduce((sum, item) => sum + (item.geneticHealth?.fertility ?? 75), 0) / pair.length;
    if (fertility < 45) maximum = breedingConfig.clutchMin;
  }
  return breedingConfig.clutchMin + Math.floor(Math.random() * (maximum - breedingConfig.clutchMin + 1));
}

function hatchMysteryEggs(count, fish) {
  const templates = [
    ["Sklenena strelka", "blue", "short", "spots", ["klidna"]],
    ["Jehlova bludicka", "violet", "fork", "stripe", ["nocni"]],
    ["Jeskynni zavojnice", "pale", "fork", "plain", ["jeskynni"]],
    ["Mechova pancernicka", "emerald", "short", "spots", ["robustni"]],
    ["Rubinova tlamovka", "ruby", "veil", "stripe", ["plodna"]],
    ["Stribrna hejnovka", "cobalt", "fork", "plain", ["klidna"]],
    ["Bahenni vousatka", "turquoise", "short", "stripe", ["hlubinna"]],
  ];
  return Array.from({ length: count }, (_, index) => {
    const [species, color, tail, pattern, traits] = templates[Math.floor(Math.random() * templates.length)];
    const speciesData = speciesCatalog[species];
    const baby = {
      id: `shop-egg-${Date.now()}-${index}`, name: breedingConfig.babyNames[Math.floor(Math.random() * breedingConfig.babyNames.length)], species,
      rarity: Math.random() < breedingConfig.mysteryRareChance ? "Rare" : "Uncommon", age: "mene nez den", ageDays: 0,
      health: 88, stress: 10, hunger: 22, healthNote: "Vylihla se z jiker nezname linie.", symptoms: [], diseases: [],
      history: ["Vylihnuta z jiker zakoupenych v akvaristickem obchode."], traits, parents: [], offspring: [],
      sex: Math.random() < 0.5 ? "samice" : "samec", tank: "nursery", x: 340 + index * 140, y: 275 + index * 42,
      speed: 31, dir: index ? -1 : 1, size: 1.6, color, tail, pattern,
      category: speciesData.category, body: speciesData.body, specialSprite: speciesData.sprite ?? null, phase: Math.random() * 5,
    };
    initializeFishGenes(baby);
    initializeGeneticHealth(baby);
    fish.push(baby); return baby;
  });
}

function inheritTraits(aTraits = [], bTraits = []) {
  const inherited = [];
  if (aTraits.length) inherited.push(aTraits[Math.floor(Math.random() * aTraits.length)]);
  if (bTraits.length) inherited.push(bTraits[Math.floor(Math.random() * bTraits.length)]);
  return [...new Set(inherited)].slice(0, 3);
}
