export const geneticsCatalogs = {
  body: { label: "Tvary tela", values: { slender: "Stihle", round: "Kulate", deep: "Hluboke", eel: "Uhorovite", diamond: "Diamantove", stocky: "Podsadite", torpedo: "Torpedovite", humpback: "Hrbaté", teardrop: "Kapkovite" } },
  tail: { label: "Ocasy", values: { short: "Kratky", fork: "Vidlicovy", veil: "Zavojovy", broad: "Siroky", lyre: "Lyrovity", paddle: "Lopatkovity", double: "Dvojity", eldritch: "Eldritch" } },
  dorsalFin: { label: "Hrbetni ploutve", values: { normal: "Bezna", clamped: "Stazena", sail: "Plachetni", spiky: "Ostnita", low: "Nizka dlouha", crown: "Korunkova", rounded: "Vejírova" } },
  ventralFin: { label: "Brisni ploutve", values: { normal: "Bezna", clamped: "Stazena", paired: "Parova", ribbon: "Stuhova", sickle: "Srpovita", fan: "Vejírova", whisker: "Vouskovita", eldritch: "Eldritch" } },
  pattern: { label: "Kresby", values: { plain: "Bez kresby", spots: "Tecky", blotches: "Velke skvrny", stripe: "Uzke pruhy", bands: "Siroke pasy", koi: "Koi skvrny", reticulated: "Sitovani", zoned: "Barevne zony", maze: "Labyrint", eyespot: "Falesne oko", glow: "Zare" } },
  color: { label: "Barvy", values: { blue: "Modra", amber: "Medova", violet: "Fialova", pale: "Bleda", black: "Cerna", coral: "Koralova", ruby: "Rubinova", emerald: "Smaragdova", gold: "Zlata", cobalt: "Kobaltova", magenta: "Purpurova", turquoise: "Tyrkysova", eldritch: "Hlubinna fialova" } },
};
export const dominanceOrder = {
  body: ["deep", "humpback", "diamond", "teardrop", "stocky", "round", "torpedo", "slender", "eel"],
  tail: ["eldritch", "double", "lyre", "broad", "veil", "paddle", "fork", "short"],
  dorsalFin: ["crown", "spiky", "sail", "rounded", "low", "normal", "clamped"],
  ventralFin: ["eldritch", "whisker", "ribbon", "sickle", "fan", "paired", "normal", "clamped"],
  pattern: ["glow", "eyespot", "maze", "koi", "bands", "blotches", "reticulated", "spots", "stripe", "zoned", "plain"],
  color: ["eldritch", "black", "magenta", "ruby", "violet", "cobalt", "emerald", "turquoise", "blue", "coral", "amber", "gold", "pale"],
};
export const hiddenAlleleChancePercent = 42;
export const defaultAlleles = { body: "slender", tail: "short", dorsalFin: "normal", ventralFin: "normal", pattern: "plain", color: "blue" };

// Hlubsi genetika. Vsechny herni dopady pribuzenskeho krizeni lze ladit tady.
export const pedigreeConfig = {
  ancestorDepth: 7,
  founderStats: { vitality: 84, immunity: 78, fertility: 76 },
  founderVariation: 9,
  heterozygosityBonus: { vitality: 5, immunity: 7, fertility: 6 },
  inbreedingPenalty: { vitality: 42, immunity: 48, fertility: 52 },
  offspringVariation: 5,
  minimumBreedingFertility: 24,
  baseDefectRisk: 0.003,
  inbreedingDefectRisk: 0.42,
  warningThresholds: { mild: 0.0625, high: 0.125, severe: 0.25 },
  diseaseProgressAtZeroImmunity: 1.35,
  diseaseProgressAtFullImmunity: 0.72,
};
