export const hungerConfig = {
  normalPerDay: 52,
  eldritchPerDay: 28,
  hungryMovementThreshold: 68,
  hungryMovementMultiplier: 1.18,
  stressThreshold: 72,
  criticalThreshold: 92,
  wellFedThreshold: 55,
  feedingPowerPerSecond: 42,
};

export const fishEnvironmentConfig = {
  preferredTemperature: 25,
  temperatureTolerance: 2,
  safeOxygen: 5.2,
  waterStressStart: 0.78,
  criticalWaterQuality: 0.55,
  recoveryWaterQuality: 0.86,
  stressPerDay: { water: 46, hunger: 18, oxygen: 32, crowding: 24, temperature: 18 },
  calmRecoveryPerDay: 6.3,
  echolocationRecoveryPerDay: 10.8,
  healthLossPerDay: { base: 10, water: 28, oxygen: 20 },
  healthRecoveryPerDay: 4,
};

export const lifeStages = {
  fry: { name: "poter", minDays: 0, scale: 0.42, speed: 0.7, canBreed: false },
  juvenile: { name: "mlada ryba", minDays: 7, scale: 0.68, speed: 0.9, canBreed: false },
  youngAdult: { name: "dorustajici", minDays: 18, scale: 0.88, speed: 1, canBreed: false },
  adult: { name: "dospela", minDays: 30, scale: 1, speed: 1, canBreed: true },
  old: { name: "starsi ryba", minDays: 120, scale: 0.96, speed: 0.86, canBreed: false },
};
export const lifeStageOrder = ["fry", "juvenile", "youngAdult", "adult", "old"];
export const treatmentDurationDays = { normal: 0.75, quarantine: 1.5 };
export const healthTuning = {
  robustDiseaseFactor: 0.55,
  contagiousCheckDays: 0.25,
  contagiousChance: 0.22,
  diseaseTransmissionSeverity: 18,
  treatmentLegacyCapDays: 1.5,
  sourceDiseaseChance: 0.65,
  maxPassiveSymptoms: 2,
  reinfectionSeverityFactor: 0.5,
  healthLabels: { badBelow: 45, reducedBelow: 70 },
  stressLabels: { calmBelow: 20, uneasyBelow: 55 },
};
