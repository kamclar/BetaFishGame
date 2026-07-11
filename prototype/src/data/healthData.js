export const symptomDatabase = {
  whiteSpots: {
    name: "bile tecky",
    observation: "Na tele se objevily bile tecky.",
    healthImpact: 18,
    stressImpact: 10,
  },
  clampedFins: {
    name: "stazene ploutve",
    observation: "Ploutve jsou stazene u tela.",
    healthImpact: 8,
    stressImpact: 16,
  },
  fastBreathing: {
    name: "rychle dychani",
    observation: "Dycha rychleji nez obvykle.",
    healthImpact: 10,
    stressImpact: 12,
  },
  paleGills: {
    name: "blede zabry",
    observation: "Zabry vypadaji blede.",
    healthImpact: 14,
    stressImpact: 8,
  },
  scratching: {
    name: "otirani o dno",
    observation: "Obcas se otira o dno nebo rostliny.",
    healthImpact: 6,
    stressImpact: 14,
  },
  cloudyEye: {
    name: "zakalene oko",
    observation: "Jedno oko je mirne zakalene.",
    healthImpact: 12,
    stressImpact: 8,
  },
};

export const diseaseDatabase = {
  whiteIch: {
    name: "bila krupicka",
    treatmentName: "pripravek proti krupicce",
    early: {
      maxSeverity: 34,
      observation: "Na tele je par bilych tecek.",
      symptoms: ["whiteSpots", "scratching"],
      healthImpact: 8,
      stressImpact: 8,
      appetite: 0.85,
      contagious: false,
      breedingBlocked: true,
    },
    bloom: {
      maxSeverity: 74,
      observation: "Ryba je poseta bilymi teckami a casto se otira.",
      symptoms: ["whiteSpots", "scratching", "clampedFins"],
      healthImpact: 28,
      stressImpact: 24,
      appetite: 0.35,
      contagious: true,
      breedingBlocked: true,
    },
    exhausted: {
      maxSeverity: 100,
      observation: "Ryba je hubena, poseta teckami a skoro nezere.",
      symptoms: ["whiteSpots", "clampedFins", "fastBreathing"],
      healthImpact: 46,
      stressImpact: 34,
      appetite: 0.12,
      contagious: true,
      breedingBlocked: true,
    },
    progressRate: 2.4,
    recoveryRate: 0.9,
    treatmentRate: 8.5,
    quarantineBonus: 1.8,
    goodWaterBonus: 1.2,
  },
};

export const troubleSources = {
  newFish: {
    name: "nova ryba",
    chance: 0.28,
    diseases: ["whiteIch"],
    symptoms: ["clampedFins", "fastBreathing"],
    log: "Nova ryba mohla prinest nemoc. Karantena by snizila riziko.",
  },
  newPlant: {
    name: "nova rostlina",
    chance: 0.18,
    diseases: ["whiteIch"],
    symptoms: ["scratching", "paleGills"],
    log: "Nova rostlina prinesla do nadrze nezname organismy.",
  },
  food: {
    name: "krmivo",
    chance: 0.05,
    symptoms: ["fastBreathing", "clampedFins"],
    log: "Krmivo nevypadalo uplne cerstve.",
  },
  badWater: {
    name: "spatna voda",
    chance: 0.22,
    symptoms: ["fastBreathing", "paleGills", "clampedFins"],
    log: "Voda rybam nesedi.",
  },
  stress: {
    name: "stres",
    chance: 0.14,
    symptoms: ["clampedFins", "scratching"],
    log: "Stres oslabil ryby.",
  },
};
