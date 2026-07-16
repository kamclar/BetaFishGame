export const plantConfig = {
  growth: {
    initialStageMin: 0.08,
    initialStageMax: 0.16,
    stages: { medium: 0.34, adult: 0.7, full: 1 },
    // Pocet hernich dnu od zasazeni. Zdrava rostlina dosahne druhe faze zhruba za 14 dnu.
    daysByType: {
      vallisneria: { medium: 14, adult: 28, full: 42 },
      anubias: { medium: 14, adult: 42, full: 70 },
      redLudwigia: { medium: 14, adult: 32, full: 48 },
      glowFern: { medium: 14, adult: 38, full: 58 },
      floatingPlant: { medium: 14, adult: 30, full: 45 },
    },
    fallbackDays: { medium: 14, adult: 35, full: 52 },
    minimumEnvironmentSpeed: 0.18,
    environmentInfluence: 1.15,
    matureHeightFractionByType: {
      // Rozsah je podil pouzitelne vysky vodniho sloupce. Konkretni kus ma stabilni hodnotu mezi min a max.
      anubias: { min: 0.37, max: 0.43 },
      redLudwigia: { min: 0.34, max: 0.4 },
      glowFern: { min: 0.35, max: 0.41 },
    },
    fallbackMatureHeightFraction: { min: 0.33, max: 0.39 },
  },
  conditionRate: 0.00035,
  minimumLightFitness: 0.12,
  flowering: { stage: 0.68, condition: 0.72, intervalDays: 30, durationDays: 7 },
  floating: { minWidth: 62, maxWidth: 88, rootDepth: 0.72 },
};

export function plantGrowthPerGameDay(type, stage, originStage = null) {
  const growth = plantConfig.growth;
  const days = growth.daysByType[type] ?? growth.fallbackDays;
  const start = originStage ?? (growth.initialStageMin + growth.initialStageMax) / 2;
  if (stage < growth.stages.medium) return (growth.stages.medium - start) / days.medium;
  if (stage < growth.stages.adult) return (growth.stages.adult - growth.stages.medium) / Math.max(1, days.adult - days.medium);
  return (growth.stages.full - growth.stages.adult) / Math.max(1, days.full - days.adult);
}
