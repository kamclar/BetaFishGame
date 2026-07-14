export const waterConfig = {
  capacities: { main: 20, quarantine: 6, nursery: 9, sale: 15, fallback: 10 },
  defaults: { ph: 7.2, temperature: 24.8, hardness: 7, oxygen: 7.6, capacity: 12, lightStrength: 1 },
  tapWater: { ph: 7.2, hardness: 7, oxygen: 8.2 },
  waterChangeFraction: 0.35,
  bioload: { fishSizeFactor: 0.72, snail: 0.35 },
  filter: { level2WasteFactor: 0.62, level2CycleStrength: 1.65 },
  dirt: {
    initialWaste: 0.12, initialDebris: 0.08, initialBrownWater: 0.04, initialAlgae: 0.06,
    wastePerFishSecond: 0.00018, debrisPerFishSecond: 0.0000002,
    brownFromDebris: 0.0000005, brownFromWaste: 0.00000025,
    algaeBase: 0.00000075, algaeFromWater: 0.00000025, snailCleaning: 0.000055,
    mapStepSeconds: 900, algaeMapGrowth: 0.018, debrisMapGrowth: 0.006,
  },
  nitrogen: {
    bioloadAmmonia: 0.00000062, wasteAmmonia: 0.0000012, debrisAmmonia: 0.00000055,
    ammoniaConversion: 0.000012, nitriteYield: 0.92, nitriteConversion: 0.0000105,
    nitrateYield: 8.2, nitrateMax: 160, ammoniaMax: 2, nitriteMax: 3,
    plantNitrateUptake: 0.000016, plantAmmoniaUptake: 0.0000007,
  },
  oxygen: {
    filter1Aeration: 0.000026, filter2Aeration: 0.000038, aerator: 0.00005,
    plantDayProduction: 0.000018, plantNightUse: 0.0000035, fishUse: 0.0000055,
    equilibrium: 8.4, min: 2, max: 10.5,
  },
  temperature: { nightAmbient: 23.2, daylightGain: 2.1, heaterSetpoint: 25, heaterRate: 0.000035, ambientRate: 0.000009 },
  safe: { ammonia: 0.1, nitrite: 0.1, nitrate: 30, oxygen: 6, temperatureMin: 22.5, temperatureMax: 27.5, hardnessMin: 3, hardnessMax: 14, phMin: 6.5, phMax: 7.8, loadPercent: 100 },
  qualityBands: { excellent: 0.9, good: 0.75, reduced: 0.58 },
  qualityWeights: { ammonia: 0.34, nitrite: 0.27, nitrate: 0.12, ph: 0.06, oxygen: 0.12, temperature: 0.04, crowding: 0.05 },
  plants: { ageRate: 0.02, growthRate: 0.00045, conditionRate: 0.00035, minimumLightFitness: 0.12 },
};

