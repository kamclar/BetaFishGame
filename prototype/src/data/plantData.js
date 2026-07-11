export const plantTypes = {
  vallisneria: {
    name: "Vallisnerie vlnita",
    shape: "ribbon",
    colors: ["#326c50", "#68ad67", "#9bd47b"],
    growth: 0.82,
    hardiness: 0.78,
    lightNeed: 0.55,
    waterBonus: 0.012,
  },
  anubias: {
    name: "Anubias kamenni",
    shape: "broad",
    colors: ["#244f42", "#477d56", "#78a968"],
    growth: 0.3,
    hardiness: 0.94,
    lightNeed: 0.25,
    waterBonus: 0.006,
  },
  redLudwigia: {
    name: "Ruducha medena",
    shape: "stem",
    colors: ["#633f46", "#a45a55", "#d88a62"],
    growth: 0.68,
    hardiness: 0.52,
    lightNeed: 0.82,
    waterBonus: 0.009,
  },
  glowFern: {
    name: "Kapradina svetélkujici",
    shape: "fern",
    colors: ["#174c50", "#2f8b82", "#69d1b5"],
    growth: 0.42,
    hardiness: 0.64,
    lightNeed: 0.38,
    waterBonus: 0.008,
  },
};

export const plantTypeOrder = Object.keys(plantTypes);

export function createPlant(type, x, height, sway = 0) {
  const definition = plantTypes[type] ?? plantTypes.vallisneria;
  return {
    type,
    x,
    h: height,
    sway,
    age: 0,
    condition: definition.hardiness,
  };
}
