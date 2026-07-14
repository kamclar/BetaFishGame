import { geneticFeatureKeys, initializeFishGenes } from "./lineageSystem.js";
import { pedigreeConfig } from "../config/geneticsConfig.js";

export function initializePedigreeArchive(economy, fish) {
  economy.pedigreeArchive ??= {};
  for (const item of fish) initializeGeneticHealth(item);
  for (const item of fish) registerFishPedigree(economy, item);
  return economy.pedigreeArchive;
}

export function initializeGeneticHealth(item) {
  initializeFishGenes(item);
  const diversity = genomeDiversity(item);
  if (!item.geneticHealth) {
    const variation = seededVariation(item.id ?? item.name ?? "fish", pedigreeConfig.founderVariation);
    item.geneticHealth = {
      vitality: clampStat(pedigreeConfig.founderStats.vitality + variation),
      immunity: clampStat(pedigreeConfig.founderStats.immunity + variation * 0.7),
      fertility: clampStat(pedigreeConfig.founderStats.fertility + variation * 0.5),
      heterozygosity: diversity,
      inbreedingCoefficient: 0,
      defectRisk: pedigreeConfig.baseDefectRisk,
    };
  }
  item.geneticHealth.heterozygosity = diversity;
  return item.geneticHealth;
}

export function assignOffspringGeneticHealth(child, a, b, archive = {}) {
  initializeGeneticHealth(a); initializeGeneticHealth(b); initializeFishGenes(child);
  const coefficient = kinshipCoefficient(a.id, b.id, archive);
  const diversity = genomeDiversity(child);
  const variation = () => (Math.random() * 2 - 1) * pedigreeConfig.offspringVariation;
  const inherited = (key) => ((a.geneticHealth[key] + b.geneticHealth[key]) / 2)
    + diversity * pedigreeConfig.heterozygosityBonus[key]
    - coefficient * pedigreeConfig.inbreedingPenalty[key]
    + variation();
  child.geneticHealth = {
    vitality: clampStat(inherited("vitality")),
    immunity: clampStat(inherited("immunity")),
    fertility: clampStat(inherited("fertility")),
    heterozygosity: diversity,
    inbreedingCoefficient: coefficient,
    defectRisk: Math.min(1, pedigreeConfig.baseDefectRisk + coefficient * pedigreeConfig.inbreedingDefectRisk),
  };
  child.health = clampStat(child.health * 0.62 + child.geneticHealth.vitality * 0.38);
  if (Math.random() < child.geneticHealth.defectRisk) {
    child.traits ??= [];
    if (!child.traits.includes("krehkaLinie")) child.traits.push("krehkaLinie");
    child.history?.push("U potomka se projevil recesivni znak krehke linie.");
  }
  return child.geneticHealth;
}

export function registerFishPedigree(economy, item) {
  economy.pedigreeArchive ??= {};
  initializeGeneticHealth(item);
  const old = economy.pedigreeArchive[item.id] ?? {};
  economy.pedigreeArchive[item.id] = {
    ...old, id: item.id, name: item.name, species: item.species,
    parents: [...(item.parents ?? [])], offspring: [...(item.offspring ?? [])],
    sex: item.sex, geneticHealth: { ...item.geneticHealth },
  };
  return economy.pedigreeArchive[item.id];
}

export function pairingAssessment(a, b, archive = {}) {
  const coefficient = kinshipCoefficient(a.id, b.id, archive);
  const risk = Math.min(1, pedigreeConfig.baseDefectRisk + coefficient * pedigreeConfig.inbreedingDefectRisk);
  const t = pedigreeConfig.warningThresholds;
  const level = coefficient >= t.severe ? "velmi vysoka" : coefficient >= t.high ? "vysoka" : coefficient >= t.mild ? "zvysena" : "nizka";
  return { coefficient, risk, level, sharedAncestors: sharedAncestorNames(a.id, b.id, archive) };
}

export function kinshipCoefficient(firstId, secondId, archive = {}) {
  if (!firstId || !secondId) return 0;
  if (firstId === secondId) return 0.5;
  const first = ancestorContributions(firstId, archive);
  const second = ancestorContributions(secondId, archive);
  let sum = 0;
  for (const [id, contribution] of first) sum += contribution * (second.get(id) ?? 0) * 0.5;
  return Math.min(0.5, sum);
}

export function geneticHealthSummary(item) {
  return initializeGeneticHealth(item);
}

function ancestorContributions(id, archive, depth = pedigreeConfig.ancestorDepth, contribution = 1, result = new Map(), path = new Set()) {
  if (!id || depth < 0 || path.has(id)) return result;
  result.set(id, (result.get(id) ?? 0) + contribution);
  const record = archive[id];
  if (!record?.parents?.length) return result;
  const nextPath = new Set(path); nextPath.add(id);
  for (const parentId of record.parents) ancestorContributions(parentId, archive, depth - 1, contribution * 0.5, result, nextPath);
  return result;
}

function sharedAncestorNames(firstId, secondId, archive) {
  const first = ancestorContributions(firstId, archive); const second = ancestorContributions(secondId, archive);
  return [...first.keys()].filter((id) => second.has(id) && id !== firstId && id !== secondId)
    .sort((a, b) => (first.get(b) * second.get(b)) - (first.get(a) * second.get(a)))
    .slice(0, 3).map((id) => archive[id]?.name ?? "neznamy predek");
}

function genomeDiversity(item) {
  const differing = geneticFeatureKeys.filter((key) => item.genotype?.[key]?.[0] !== item.genotype?.[key]?.[1]).length;
  return differing / geneticFeatureKeys.length;
}

function seededVariation(seed, extent) {
  let hash = 0;
  for (const char of String(seed)) hash = ((hash * 31) + char.charCodeAt(0)) >>> 0;
  return ((hash % 2001) / 1000 - 1) * extent;
}

function clampStat(value) { return Math.max(0, Math.min(100, Math.round(value))); }
