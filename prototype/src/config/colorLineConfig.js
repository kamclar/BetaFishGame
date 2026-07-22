export const colorLineConfig = {
  obsidianGold: { name: "Obsidiánová", body: "black", pattern: "gold", accent: "pale", rarity: "Rare", valueBonus: 0.24 },
  royalBlue: { name: "Královská", body: "cobalt", pattern: "gold", accent: "blue", rarity: "Rare", valueBonus: 0.22 },
  orchidFlame: { name: "Orchidejový plamen", body: "violet", pattern: "amber", accent: "pale", rarity: "Exotic", valueBonus: 0.34 },
  koi: { name: "Koi", body: "pale", pattern: "coral", accent: "black", rarity: "Rare", valueBonus: 0.25 },
  nightCoral: { name: "Noční korál", body: "black", pattern: "coral", accent: "pale", rarity: "Rare", valueBonus: 0.23 },
  emeraldMask: { name: "Smaragdová maska", body: "emerald", pattern: "turquoise", accent: "gold", rarity: "Rare", valueBonus: 0.21 },
  moonlight: { name: "Měsíční", body: "black", pattern: "pale", accent: "blue", rarity: "Rare", valueBonus: 0.2 },
  warning: { name: "Výstražná", body: "black", pattern: "gold", accent: "coral", rarity: "Exotic", valueBonus: 0.31 },
  deepSignal: { name: "Hlubinný signál", body: "eldritch", pattern: "cobalt", accent: "magenta", rarity: "Exotic", valueBonus: 0.36 },
  pearl: { name: "Perleťová", body: "pale", pattern: "blue", accent: "violet", rarity: "Uncommon", valueBonus: 0.14 },
  imperialBanner: { name: "Císařská praporka", body: "black", pattern: "pale", accent: "amber", rarity: "Exotic", valueBonus: 0.33 },
  neonFlash: { name: "Neonový záblesk", body: "cobalt", pattern: "turquoise", accent: "ruby", rarity: "Rare", valueBonus: 0.26 },
};

export function colorLineForFish(item) {
  if (!item || !item.pattern || item.pattern === "plain") return null;
  return Object.entries(colorLineConfig).find(([, line]) => line.body === item.color
    && line.pattern === item.patternColor && line.accent === item.accentColor)?.[1] ?? null;
}

export function colorLineValueMultiplier(item) {
  return 1 + (colorLineForFish(item)?.valueBonus ?? 0);
}
