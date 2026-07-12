const names = ["Jiskricka", "Perlicka", "Kapka", "Stinek", "Supinka", "Vlnka"];

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
const courtshipSeconds = debugMode ? 12 : 6 * 60 * 60;
const incubationSeconds = debugMode ? 18 : 24 * 60 * 60;

export function updateSpawning(delta, tank, fish, onEggs, onHatch) {
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
  else if (eggParents.length === 2) onHatch(breedPair(eggParents[0], eggParents[1], fish, state.eggs.count), eggParents);
  state.eggs = null;
  state.cooldown = debugMode ? 30 : 3 * 24 * 60 * 60;
}

export function breedPair(a, b, fish, count = 2) {
  return Array.from({ length: count }, (_, index) => {
    const visual = Math.random() < 0.5 ? a : b;
    const id = `f${Date.now()}-${index}`;
    const baby = {
      id, name: names[Math.floor(Math.random() * names.length)],
      species: a.species === b.species ? a.species : `${a.species} × ${b.species}`,
      rarity: Math.random() < 0.12 ? "Rare" : "Common",
      age: "mene nez den", ageDays: 0, health: Math.round((a.health + b.health) / 2), stress: 8, hunger: 24,
      healthNote: "Mlady poter potrebuje klidnou a cistou vodu.", symptoms: [], diseases: [],
      history: [`Vylihnut ve treci nadrzi. Rodice: ${a.name} a ${b.name}.`],
      traits: [...new Set([...a.traits, ...b.traits])].filter(() => Math.random() < 0.45).slice(0, 2),
      parents: [a.id, b.id], offspring: [], sex: Math.random() < 0.5 ? "samice" : "samec",
      tank: "nursery", x: 320 + index * 130, y: 270 + index * 50, speed: 32, dir: index ? -1 : 1, size: 1.65,
      color: Math.random() < 0.5 ? a.color : b.color, tail: Math.random() < 0.5 ? a.tail : b.tail,
      pattern: Math.random() < 0.5 ? a.pattern : b.pattern, specialSprite: visual.specialSprite, phase: Math.random() * 5,
    };
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
    ["Sklenena strelka", "glassArrow", "blue", "short", "spots", ["klidna"]],
    ["Jehlova bludicka", "needleWanderer", "violet", "fork", "stripe", ["nocni"]],
    ["Jeskynni zavojnice", "caveGhost", "pale", "fork", "plain", ["jeskynni"]],
  ];
  return Array.from({ length: count }, (_, index) => {
    const [species, sprite, color, tail, pattern, traits] = templates[Math.floor(Math.random() * templates.length)];
    const baby = {
      id: `shop-egg-${Date.now()}-${index}`, name: names[Math.floor(Math.random() * names.length)], species,
      rarity: Math.random() < 0.18 ? "Rare" : "Uncommon", age: "mene nez den", ageDays: 0,
      health: 88, stress: 10, hunger: 22, healthNote: "Vylihla se z jiker nezname linie.", symptoms: [], diseases: [],
      history: ["Vylihnuta z jiker zakoupenych v akvaristickem obchode."], traits, parents: [], offspring: [],
      sex: Math.random() < 0.5 ? "samice" : "samec", tank: "nursery", x: 340 + index * 140, y: 275 + index * 42,
      speed: 31, dir: index ? -1 : 1, size: 1.6, color, tail, pattern, specialSprite: sprite, phase: Math.random() * 5,
    };
    fish.push(baby); return baby;
  });
}
