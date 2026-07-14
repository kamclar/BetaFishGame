export const salesConfig = {
  rarityValue: { Common: 8, Uncommon: 15, Rare: 28, Exotic: 52, Mythic: 95, Eldritch: 170 },
  minimumPrice: 3,
  healthValueMin: 0.45,
  healthValueRange: 0.55,
  ageValue: { adult: 1.25, youngAdult: 1, other: 0.65 },
  traitValue: 2,
  pedigreeValue: 4,
  visitor: { maxActive: 3, normalStay: 24, debugStay: 7, normalInterval: 35, debugInterval: 6, leavingSpeed: 0.16, arrivingSpeed: 0.34 },
  purchaseChance: { diseased: 0.015, symptomatic: 0.08, weak: 0.12, reduced: 0.34, healthy: 0.72 },
};
