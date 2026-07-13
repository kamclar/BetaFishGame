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
    cthulhu: "fish_cthulhu",
  },
  body: {
    slender: "body_slender_v3",
    round: "body_round_v3",
    deep: "body_deep_v4",
    eel: "body_eel_v1",
    diamond: "body_diamond_v1",
    stocky: "body_stocky_v1",
  },
  tail: {
    short: "tail_fan_v2",
    fork: "tail_fork_v2",
    veil: "tail_veil_v3",
    broad: "tail_broad_v3",
    eldritch: "tail_eldritch",
  },
  fins: {
    normal: "fins_normal",
    clamped: "fins_clamped",
  },
  dorsalFin: {
    normal: "fin_dorsal_v2",
    clamped: "fin_dorsal_clamped",
    sail: "fin_dorsal_sail",
    spiky: "fin_dorsal_spiky",
  },
  ventralFin: {
    normal: "fin_ventral_leaf",
    clamped: "fin_ventral_clamped",
    paired: "fin_ventral_paired",
    ribbon: "fin_ventral_ribbon",
    eldritch: "fin_ventral_eldritch",
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
