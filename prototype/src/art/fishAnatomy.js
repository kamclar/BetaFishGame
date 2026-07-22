export const bodyAnatomy = {
  slender: {
    file: "body_slender_v3",
    anchors: { tail: [15, 32], fins: [50, 32], dorsal: [47, 20], ventral: [50, 36] },
    partScales: { tail: 0.4, dorsal: 1, ventral: 0.9 },
    scale: 1,
  },
  round: {
    file: "body_round_v3",
    anchors: { tail: [15, 32], fins: [50, 32], dorsal: [44, 15], ventral: [46, 40] },
    partScales: { tail: 0.66, dorsal: 0.9, ventral: 0.85 },
    scale: 1,
  },
  deep: {
    file: "body_deep_v4",
    anchors: { tail: [15, 32], fins: [51, 32], dorsal: [38, 11], ventral: [49, 43] },
    partScales: { tail: 0.58, dorsal: 1.2, ventral: 1.05 },
    scale: 1,
  },
  eel: {
    file: "body_eel_v2",
    frameWidth: 96,
    frameHeight: 64,
    frameCount: 4,
    animationSpeed: 2,
    anchors: { tail: [15, 32], fins: [50, 32], dorsal: [46, 29], ventral: [50, 36] },
    partScales: { tail: 0.35, dorsal: 0.75, ventral: 0.8 },
    scale: 1,
  },
  diamond: {
    file: "body_diamond_v1",
    anchors: { tail: [15, 32], fins: [50, 32], dorsal: [42, 19], ventral: [48, 45] },
    partScales: { tail: 0.62, dorsal: 1.1, ventral: 1 },
    scale: 1,
  },
  stocky: {
    file: "body_stocky_v1",
    anchors: { tail: [15, 32], fins: [50, 32], dorsal: [45, 18], ventral: [48, 40] },
    partScales: { tail: 0.5, dorsal: 0.85, ventral: 0.9 },
    scale: 1,
  },
  torpedo: {
    file: "body_torpedo_v1",
    anchors: { tail: [12, 32], fins: [51, 32], dorsal: [45, 16], ventral: [50, 44] },
    partScales: { tail: 0.72, dorsal: 0.9, ventral: 0.9 },
    scale: 1,
  },
  humpback: {
    file: "body_humpback_v1",
    anchors: { tail: [12, 32], fins: [50, 32], dorsal: [34, 12], ventral: [39, 42] },
    partScales: { tail: 0.78, dorsal: 1.05, ventral: 0.95 },
    scale: 1,
  },
  teardrop: {
    file: "body_teardrop_v1",
    anchors: { tail: [12, 32], fins: [49, 32], dorsal: [34, 15], ventral: [39, 42] },
    partScales: { tail: 0.8, dorsal: 1, ventral: 0.95 },
    scale: 1,
  },
};

export const tailAnatomy = {
  short: { file: "tail_fan_v2", socket: [82, 32], scale: 1 },
  fork: { file: "tail_fork_v2", socket: [82, 32], scale: 1 },
  veil: { file: "tail_veil_v3", socket: [82, 32], scale: 1 },
  broad: { file: "tail_broad_v3", socket: [82, 32], scale: 1 },
  lyre: { file: "tail_lyre_v1", socket: [82, 32], scale: 1 },
  paddle: { file: "tail_paddle_v1", socket: [82, 32], scale: 1 },
  double: { file: "tail_double_v1", socket: [82, 32], scale: 1 },
  eldritch: { file: "tail_eldritch", socket: [82, 32], scale: 1 },
};

export const dorsalFinAnatomy = {
  normal: { file: "fin_dorsal_v2", socket: [46, 32], scale: 1 },
  clamped: { file: "fin_dorsal_clamped", socket: [50, 31], scale: 0.72 },
  sail: { file: "fin_dorsal_sail", socket: [46, 32], scale: 1 },
  spiky: { file: "fin_dorsal_spiky", socket: [46, 32], scale: 1 },
  low: {
    file: "fin_dorsal_low_v1", socket: [46, 32], scale: 1,
    frameSockets: [[48.08, 32], [44.09, 32], [43.55, 32], [45.09, 32]],
  },
  crown: { file: "fin_dorsal_crown_v1", socket: [46, 32], scale: 1 },
  rounded: { file: "fin_dorsal_round_v1", socket: [46, 32], scale: 0.72 },
};

export const ventralFinAnatomy = {
  normal: { file: "fin_ventral_leaf", socket: [56, 28], scale: 1 },
  clamped: { file: "fin_ventral_clamped", socket: [50, 32], scale: 0.72 },
  paired: { file: "fin_ventral_paired", socket: [56, 28], scale: 1 },
  ribbon: { file: "fin_ventral_ribbon", socket: [56, 28], scale: 1 },
  sickle: { file: "fin_ventral_sickle_v1", socket: [56, 28], scale: 1 },
  fan: { file: "fin_ventral_fan_v1", socket: [56, 28], scale: 1 },
  whisker: { file: "fin_ventral_whisker_v1", socket: [56, 28], scale: 1 },
  eldritch: { file: "fin_ventral_eldritch", socket: [56, 26], scale: 1 },
};

export function attachmentOffset(anchor, socket, partScale = 1) {
  return {
    x: anchor[0] - socket[0] * partScale,
    y: anchor[1] - socket[1] * partScale,
  };
}
