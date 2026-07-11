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

export function breedPair(a, b, fish) {
  return Array.from({ length: 2 }, (_, index) => {
    const visual = Math.random() < 0.5 ? a : b;
    const id = `f${Date.now()}-${index}`;
    const baby = {
      id, name: names[Math.floor(Math.random() * names.length)],
      species: a.species === b.species ? a.species : `${a.species} × ${b.species}`,
      rarity: Math.random() < 0.12 ? "Rare" : "Common",
      age: "mene nez den", ageDays: 0, health: Math.round((a.health + b.health) / 2), stress: 8, hunger: 24,
      healthNote: "Mlady poter potrebuje klidnou a cistou vodu.", symptoms: [], diseases: [],
      history: [`Narozen v odchovne. Rodice: ${a.name} a ${b.name}.`],
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
