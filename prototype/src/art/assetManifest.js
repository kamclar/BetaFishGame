export const spriteConfig = {
  basePath: "./assets/fish",
  frameCount: 4,
  frameWidth: 96,
  frameHeight: 64,
};

export const fishSpriteParts = {
  special: {
    stormSpine: "fish_storm_spine",
    honeyGold: "fish_honey_gold",
    caveGhost: "fish_cave_ghost",
    glassArrow: "fish_glass_arrow",
    needleWanderer: "fish_needle_wanderer",
    deepPerch: "fish_deep_perch",
  },
  body: {
    slender: "body_slender",
    round: "body_round",
    deep: "body_deep",
  },
  tail: {
    short: "tail_short",
    fork: "tail_fork",
    veil: "tail_veil",
  },
  fins: {
    normal: "fins_normal",
    clamped: "fins_clamped",
  },
  pattern: {
    plain: null,
    spots: "pattern_spots",
    stripe: "pattern_stripe",
    glow: "pattern_glow",
  },
  symptoms: {
    whiteSpots: "symptom_white_spots",
    paleGills: "symptom_pale_gills",
    cloudyEye: "symptom_cloudy_eye",
    scratching: "symptom_scratching",
    fastBreathing: "symptom_fast_breathing",
  },
};

export const speciesSpriteDefaults = {
  "Sklenena strelka": {
    body: "slender",
    fins: "normal",
  },
  "Jehlova bludicka": {
    body: "slender",
    fins: "normal",
  },
  "Jezirkovy okounik": {
    body: "deep",
    fins: "normal",
  },
  "Medova cipernice": {
    body: "round",
    fins: "normal",
  },
};
