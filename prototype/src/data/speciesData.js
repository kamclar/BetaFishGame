export const fishCategories = {
  shoaling: "Hejnovky",
  labyrinth: "Labyrintky",
  bottom: "Dnové ryby",
  cave: "Jeskynní ryby",
  pond: "Jezírkové ryby",
  oddity: "Zvláštní druhy",
  hybrid: "Kříženci",
};

export const speciesCatalog = {
  "Sklenena strelka": { category: "shoaling", body: "slender", sprite: "glassArrow", rarity: "Common" },
  "Jehlova bludicka": { category: "labyrinth", body: "slender", sprite: "needleWanderer", rarity: "Uncommon" },
  "Jezirkovy okounik": { category: "pond", body: "deep", sprite: "deepPerch", rarity: "Rare" },
  "Medova cipernice": { category: "shoaling", body: "round", sprite: "honeyGold", rarity: "Common" },
  "Jeskynni zavojnice": { category: "cave", body: "slender", sprite: "caveGhost", rarity: "Rare" },
  "Bourkova trnka": { category: "oddity", body: "deep", sprite: "stormSpine", rarity: "Rare" },
  "Mechova pancernicka": { category: "bottom", body: "round", rarity: "Uncommon" },
  "Rubinova tlamovka": { category: "labyrinth", body: "deep", rarity: "Uncommon" },
  "Stribrna hejnovka": { category: "shoaling", body: "slender", rarity: "Common" },
  "Bahenni vousatka": { category: "bottom", body: "slender", rarity: "Common" },
};

export function applySpeciesMetadata(items) {
  for (const item of items) {
    const species = speciesCatalog[item.species];
    item.category ??= species?.category ?? (item.parents?.length ? "hybrid" : "oddity");
    item.body ??= species?.body ?? "slender";
  }
}

export function categoryName(id) {
  return fishCategories[id] ?? id ?? "Nezařazené";
}
