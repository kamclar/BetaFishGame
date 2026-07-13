import { speciesCatalog } from "../data/speciesData.js";
import { applyEldritchLineage } from "./eldritchSystem.js";

const names = ["Jiskricka", "Perlicka", "Kapka", "Stinek", "Supinka", "Vlnka"];
const inheritableColors = ["blue", "amber", "violet", "pale", "black", "coral", "ruby", "emerald", "gold", "cobalt", "magenta", "turquoise"];

export function initializeBreeding(fish) {
  fish.forEach((item, index) => {
    item.sex ??= index % 2 ? "samec" : "samice";
    item.parents ??= [];
    item.offspring ??= [];
  });
}

export function findMate(parent, fish) {
  if (!parent.canBreed) return null;
  return fish.find((item) => item.id !== parent.id && item.tank === parent.tank && item.sex !== parent.sex && item.canBreed && item.health >= 72 && item.stress < 45) ?? null;
}

const debugMode = new URLSearchParams(location.search).has("debugTime");
const courtshipSeconds = debugMode ? 12 : 12 * 60;
const incubationSeconds = debugMode ? 18 : 30 * 60;

export function updateSpawning(delta, tank, fish, onEggs, onHatch, context = {}) {
  tank.spawning ??= { courtship: 0, eggs: null, cooldown: 0 };
  const state = tank.spawning;
  state.cooldown = Math.max(0, state.cooldown - delta);
  const parents = fish.filter((item) => item.tank === "nursery" && item.canBreed && item.health >= 72 && item.stress < 45 && item.diseases.length === 0);
  const pair = parents.length === 2 && parents[0].sex !== parents[1].sex ? parents : null;

  if (!state.eggs && pair && state.cooldown <= 0) {
    state.courtship += delta;
    if (state.courtship >= courtshipSeconds) {
      state.eggs = { parentIds: pair.map((item) => item.id), age: 0, count: 1 + Math.floor(Math.random() * 2), kind: "natural" };
      state.courtship = 0;
      onEggs(pair);
    }
  } else if (!state.eggs) {
    state.courtship = 0;
  }

  if (!state.eggs) return;
  state.eggs.age += delta;
  if (state.eggs.age < incubationSeconds) return;
  const eggParents = (state.eggs.parentIds ?? []).map((id) => fish.find((item) => item.id === id)).filter(Boolean);
  if (state.eggs.kind === "shop") onHatch(hatchMysteryEggs(state.eggs.count, fish), []);
  else if (eggParents.length === 2) onHatch(breedPair(eggParents[0], eggParents[1], fish, state.eggs.count, context), eggParents);
  state.eggs = null;
  state.cooldown = debugMode ? 30 : 6 * 60 * 60;
}

export function breedPair(a, b, fish, count = 2, context = {}) {
  return Array.from({ length: count }, (_, index) => {
    const purebred = a.species === b.species;
    const colorParent = Math.random() < 0.5 ? a : b;
    const tailParent = Math.random() < 0.5 ? a : b;
    const patternParent = Math.random() < 0.5 ? a : b;
    const bodyParent = Math.random() < 0.5 ? a : b;
    const dorsalParent = Math.random() < 0.5 ? a : b;
    const ventralParent = Math.random() < 0.5 ? a : b;
    const id = `f${Date.now()}-${index}`;
    const baby = {
      id, name: names[Math.floor(Math.random() * names.length)],
      species: a.species === b.species ? a.species : `${a.species} × ${b.species}`,
      category: purebred ? (a.category ?? b.category) : "hybrid",
      rarity: Math.random() < (purebred ? 0.12 : 0.22) ? "Rare" : "Common",
      age: "mene nez den", ageDays: 0, health: Math.round((a.health + b.health) / 2), stress: 8, hunger: 24,
      healthNote: "Mlady poter potrebuje klidnou a cistou vodu.", symptoms: [], diseases: [],
      history: [`Vylihnut ve treci nadrzi. Rodice: ${a.name} a ${b.name}.`],
      traits: inheritTraits(a.traits, b.traits),
      parents: [a.id, b.id], offspring: [], sex: Math.random() < 0.5 ? "samice" : "samec",
      tank: "nursery", x: 320 + index * 130, y: 270 + index * 50, speed: 32, dir: index ? -1 : 1, size: 1.65,
      color: Math.random() < 0.12
        ? inheritableColors[Math.floor(Math.random() * inheritableColors.length)]
        : colorParent.color,
      tail: tailParent.tail, pattern: patternParent.pattern,
      body: bodyParent.body ?? "slender", specialSprite: purebred ? (a.specialSprite ?? b.specialSprite) : null,
      dorsalFin: dorsalParent.dorsalFin ?? "normal", ventralFin: ventralParent.ventralFin ?? "normal",
      genetics: {
        colorFrom: colorParent.id, tailFrom: tailParent.id, patternFrom: patternParent.id,
        bodyFrom: bodyParent.id, dorsalFinFrom: dorsalParent.id, ventralFinFrom: ventralParent.id,
      }, phase: Math.random() * 5,
    };
    applyEldritchLineage(baby, a, b, context);
    fish.push(baby); a.offspring.push(id); b.offspring.push(id);
    return baby;
  });
}

export function addMysteryEggs(tank) {
  tank.spawning ??= { courtship: 0, eggs: null, cooldown: 0 };
  if (tank.spawning.eggs) return false;
  tank.spawning.eggs = { parentIds: [], age: 0, count: 1 + Math.floor(Math.random() * 2), kind: "shop" };
  return true;
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
      id: `shop-egg-${Date.now()}-${index}`, name: names[Math.floor(Math.random() * names.length)], species,
      rarity: Math.random() < 0.18 ? "Rare" : "Uncommon", age: "mene nez den", ageDays: 0,
      health: 88, stress: 10, hunger: 22, healthNote: "Vylihla se z jiker nezname linie.", symptoms: [], diseases: [],
      history: ["Vylihnuta z jiker zakoupenych v akvaristickem obchode."], traits, parents: [], offspring: [],
      sex: Math.random() < 0.5 ? "samice" : "samec", tank: "nursery", x: 340 + index * 140, y: 275 + index * 42,
      speed: 31, dir: index ? -1 : 1, size: 1.6, color, tail, pattern,
      category: speciesData.category, body: speciesData.body, specialSprite: speciesData.sprite ?? null, phase: Math.random() * 5,
    };
    fish.push(baby); return baby;
  });
}

function inheritTraits(aTraits = [], bTraits = []) {
  const inherited = [];
  if (aTraits.length) inherited.push(aTraits[Math.floor(Math.random() * aTraits.length)]);
  if (bTraits.length) inherited.push(bTraits[Math.floor(Math.random() * bTraits.length)]);
  return [...new Set(inherited)].slice(0, 3);
}
