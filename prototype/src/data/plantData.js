import { plantConfig } from "../config/plantConfig.js";

export const plantTypes = {
  vallisneria: {
    name: "Vallisnerie vlnita",
    shape: "ribbon",
    colors: ["#326c50", "#68ad67", "#9bd47b"],
    hardiness: 0.78,
    lightNeed: 0.55,
    waterBonus: 0.012,
    heightPotential: 0.96,
    spread: 1.18,
    variantCount: 4,
    shopAction: "plantVallisneria",
    shopDescription: "Rychla vysoka trava. Tvori husty ukryt u zadni steny.",
  },
  anubias: {
    name: "Anubias kamenni",
    shape: "broad",
    colors: ["#244f42", "#477d56", "#78a968"],
    hardiness: 0.94,
    lightNeed: 0.25,
    waterBonus: 0.006,
    heightPotential: 0.48,
    spread: 1.42,
    variantCount: 4,
    shopAction: "plantAnubias",
    shopDescription: "Odolna sirokolista rostlina. Snese mene svetla a roste pomalu.",
  },
  redLudwigia: {
    name: "Ruducha medena",
    shape: "stem",
    colors: ["#633f46", "#a45a55", "#d88a62"],
    hardiness: 0.52,
    lightNeed: 0.82,
    waterBonus: 0.009,
    heightPotential: 0.88,
    spread: 1.24,
    variantCount: 4,
    shopAction: "plantLudwigia",
    shopDescription: "Medene stonky pro svetle nadrze. Roste rychleji, ale je citlivejsi.",
  },
  glowFern: {
    name: "Kapradina svetélkujici",
    shape: "fern",
    colors: ["#174c50", "#2f8b82", "#69d1b5"],
    hardiness: 0.64,
    lightNeed: 0.38,
    waterBonus: 0.008,
    heightPotential: 0.74,
    spread: 1.32,
    variantCount: 4,
    shopAction: "plantFern",
    shopDescription: "Kosata tyrkysova kapradina. Ma rada mirne svetlo a cistou vodu.",
  },
  floatingPlant: {
    name: "Pistie plovouci",
    shape: "floating",
    colors: ["#315f35", "#75a947", "#c8dc70"],
    hardiness: 0.7,
    lightNeed: 0.72,
    waterBonus: 0.014,
    spread: 1.35,
    variantCount: 4,
    shopAction: "plantFloating",
    shopDescription: "Plave na hladine, stini vodu a spousti dlouhe koreny.",
  },
};

export const plantTypeOrder = Object.keys(plantTypes);

export function createPlant(type, x, height, sway = 0) {
  const definition = plantTypes[type] ?? plantTypes.vallisneria;
  const initialStage = plantConfig.growth.initialStageMin
    + Math.random() * (plantConfig.growth.initialStageMax - plantConfig.growth.initialStageMin);
  return {
    type,
    x,
    // h je cilova vyska dospele rostliny; growthStage urcuje aktualni velikost.
    h: height,
    sway,
    age: 0,
    ageDays: 0,
    growthStage: initialStage,
    growthOriginStage: initialStage,
    condition: definition.hardiness,
    flowerPhase: Math.random() * Math.PI * 2,
    visualVariant: Math.floor(Math.random() * (definition.variantCount ?? 1)),
    flowering: false,
  };
}

export function plantGrowthScale(plant) {
  const stage = Math.max(0, Math.min(1, plant.growthStage ?? Math.min(1, 0.16 + (plant.age ?? 0) * 0.012)));
  const eased = stage * stage * (3 - 2 * stage);
  return 0.3 + eased * 0.7;
}
