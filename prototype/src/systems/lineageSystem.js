import { defaultAlleles, dominanceOrder, geneticsCatalogs, hiddenAlleleChancePercent } from "../config/geneticsConfig.js";
import { colorLineConfig, colorLineForFish } from "../config/colorLineConfig.js";
const catalogs = geneticsCatalogs;

export const geneticFeatureKeys = ["body", "tail", "dorsalFin", "ventralFin", "pattern", "overlayPattern", "finPattern", "color", "patternColor", "accentColor"];

const featureLabels = {
  body: "Telo", tail: "Ocas", dorsalFin: "Hrbetni ploutev",
  ventralFin: "Brisni ploutev", pattern: "Kresba", color: "Barva tela",
  overlayPattern: "Doplnkova kresba", finPattern: "Kresba ploutvi",
  patternColor: "Barva kresby", accentColor: "Barva ploutvi",
};

export function initializeFishGenes(item) {
  item.genotype ??= {};
  item.revealedGenes ??= {};
  initializePigmentPhenotype(item);
  for (const key of geneticFeatureKeys) {
    item[key] ??= defaultAllele(key);
    const visible = item[key];
    if (!validAllele(key, visible)) continue;
    const existing = item.genotype[key];
    if (!Array.isArray(existing) || existing.length !== 2 || existing.some((allele) => !validAllele(key, allele))) {
      item.genotype[key] = [visible, deterministicHiddenAllele(item.id ?? item.name ?? "fish", key, visible)];
    }
  }
}

function initializePigmentPhenotype(item) {
  const seed = item.id ?? item.name ?? "fish";
  item.color ??= defaultAlleles.color;
  item.patternColor ??= deterministicVisiblePigment(seed, "patternColor", item.color, 55);
  item.accentColor ??= deterministicVisiblePigment(seed, "accentColor", item.color, 76);
}

function deterministicVisiblePigment(seed, key, baseColor, sameColorPercent) {
  const values = Object.keys(catalogs.color.values).filter((value) => value !== "eldritch");
  let hash = 2166136261;
  for (const char of `${seed}:${key}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  if (hash % 100 < sameColorPercent) return baseColor;
  const alternatives = values.filter((value) => value !== baseColor);
  return alternatives[hash % alternatives.length] ?? baseColor;
}

export function inheritFishGenes(child, a, b) {
  initializeFishGenes(a);
  initializeFishGenes(b);
  child.genotype = {};
  child.revealedGenes = {};
  child.genetics ??= {};
  for (const key of geneticFeatureKeys) {
    const fromA = randomAllele(a.genotype[key]);
    const fromB = randomAllele(b.genotype[key]);
    child.genotype[key] = [fromA, fromB];
    child[key] = expressedAllele(key, fromA, fromB);
    child.genetics[`${key}Alleles`] = [{ parentId: a.id, allele: fromA }, { parentId: b.id, allele: fromB }];
    revealCarriedAllele(a, key, fromA);
    revealCarriedAllele(b, key, fromB);
  }
}

export function hiddenGeneRows(item) {
  initializeFishGenes(item);
  return geneticFeatureKeys.map((key) => {
    const pair = item.genotype[key] ?? [];
    const hidden = pair.find((allele) => allele !== item[key]);
    const revealed = hidden && item.revealedGenes?.[key] === hidden;
    return {
      key,
      label: featureLabels[key],
      visible: alleleName(key, item[key]),
      hidden: hidden ? (revealed ? alleleName(key, hidden) : "Neznamy") : "Zadny odlisny",
      revealed,
    };
  });
}

export function alleleName(key, allele) {
  return catalogs[key]?.values?.[allele] ?? allele ?? "Neznamy";
}

function revealCarriedAllele(parent, key, transmitted) {
  if (transmitted !== parent[key]) parent.revealedGenes[key] = transmitted;
}

function randomAllele(pair) {
  return pair[Math.random() < 0.5 ? 0 : 1];
}

function expressedAllele(key, first, second) {
  const order = dominanceOrder[key] ?? [];
  return order.indexOf(first) <= order.indexOf(second) ? first : second;
}

function deterministicHiddenAllele(seed, key, visible) {
  const values = Object.keys(catalogs[key].values).filter((value) => value !== "eldritch");
  let hash = 0;
  for (const char of `${seed}:${key}`) hash = ((hash * 31) + char.charCodeAt(0)) >>> 0;
  if (hash % 100 >= hiddenAlleleChancePercent) return visible;
  return values[hash % values.length] ?? visible;
}

function validAllele(key, allele) {
  return Boolean(catalogs[key]?.values?.[allele]);
}

function defaultAllele(key) {
  return defaultAlleles[key];
}

export function initializeLineageAtlas(economy) {
  if ((economy.atlasVersion ?? 0) < 2) {
    economy.atlas = {};
    economy.atlasSightings = {};
    economy.atlasVersion = 2;
  }
  economy.atlas ??= {};
  economy.atlasSightings ??= {};
  economy.atlasFish ??= [];
  economy.colorLineAtlas ??= [];
  economy.colorLineSightings ??= {};
  for (const key of Object.keys(catalogs)) economy.atlas[key] ??= [];
  for (const key of Object.keys(catalogs)) economy.atlasSightings[key] ??= {};
}

export function observeLineageFeatures(economy, item) {
  initializeLineageAtlas(economy);
  const discovered = [];
  for (const [key, catalog] of Object.entries(catalogs)) {
    const value = item[key];
    if (!value || !catalog.values[value]) continue;
    if (!economy.atlas[key].includes(value)) {
      economy.atlas[key].push(value);
      discovered.push({ key, value, name: catalog.values[value] });
    }
    economy.atlasSightings[key][value] ??= [];
    if (!economy.atlasSightings[key][value].includes(item.id)) economy.atlasSightings[key][value].push(item.id);
  }
  const colorLineEntry = Object.entries(colorLineConfig).find(([, line]) => line === colorLineForFish(item));
  if (colorLineEntry) {
    const [lineId, line] = colorLineEntry;
    if (!economy.colorLineAtlas.includes(lineId)) {
      economy.colorLineAtlas.push(lineId);
      discovered.push({ key: "colorLine", value: lineId, name: line.name });
    }
    economy.colorLineSightings[lineId] ??= [];
    if (item.id && !economy.colorLineSightings[lineId].includes(item.id)) economy.colorLineSightings[lineId].push(item.id);
  }
  if (item.id) {
    const snapshot = {
      id: item.id, name: item.name, species: item.species, firstSeenTank: item.tank,
      body: item.body, tail: item.tail, dorsalFin: item.dorsalFin, ventralFin: item.ventralFin,
      pattern: item.pattern, overlayPattern: item.overlayPattern, finPattern: item.finPattern,
      color: item.color, patternColor: item.patternColor,
      accentColor: item.accentColor, size: item.size, growthScale: item.growthScale,
      specialSprite: item.specialSprite, eldritchStage: item.eldritchStage,
    };
    const existingSnapshot = economy.atlasFish.find((fish) => fish.id === item.id);
    if (existingSnapshot) Object.assign(existingSnapshot, snapshot, { firstSeenTank: existingSnapshot.firstSeenTank });
    else economy.atlasFish.push(snapshot);
  }
  return discovered;
}

export function lineageAtlasFish(economy) {
  initializeLineageAtlas(economy);
  return economy.atlasFish;
}

export function lineageAtlasSections(economy) {
  const featureSections = Object.entries(catalogs).map(([key, catalog]) => ({
    key,
    label: catalog.label,
    entries: Object.entries(catalog.values).map(([id, name]) => ({
      id, name,
      discovered: economy.atlas?.[key]?.includes(id) ?? false,
      sightings: economy.atlasSightings?.[key]?.[id]?.length ?? 0,
    })),
  }));
  featureSections.push({
    key: "colorLine",
    label: "Barevne linie",
    entries: Object.entries(colorLineConfig).map(([id, line]) => ({
      id, name: `${line.name} (${line.rarity})`,
      discovered: economy.colorLineAtlas?.includes(id) ?? false,
      sightings: economy.colorLineSightings?.[id]?.length ?? 0,
    })),
  });
  return featureSections;
}

export const inheritedFeatureLabels = {
  body: "Telo", tail: "Ocas", dorsalFin: "Hrbetni ploutev",
  ventralFin: "Brisni ploutev", pattern: "Kresba", color: "Barva tela",
  overlayPattern: "Doplnkova kresba", finPattern: "Kresba ploutvi",
  patternColor: "Barva kresby", accentColor: "Barva ploutvi",
};
