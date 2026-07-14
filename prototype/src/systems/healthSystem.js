import { diseaseDatabase, symptomDatabase, troubleSources } from "../data/healthData.js";
import { healthTuning } from "../config/fishConfig.js";
import { pedigreeConfig } from "../config/geneticsConfig.js";

let contagionTimer = 0;

export function getDiseaseStage(disease, severity) {
  if (severity <= disease.early.maxSeverity) return { name: "zacatek", ...disease.early };
  if (severity <= disease.bloom.maxSeverity) return { name: "rozpuk", ...disease.bloom };
  return { name: "vycerpani", ...disease.exhausted };
}

export function getActiveSymptoms(item) {
  const active = new Set(item.symptoms);
  for (const diseaseCase of item.diseases) {
    const disease = diseaseDatabase[diseaseCase.id];
    if (!disease) continue;
    const stage = getDiseaseStage(disease, diseaseCase.severity);
    for (const symptomId of stage.symptoms) active.add(symptomId);
  }
  return [...active];
}

export function updateTroubleEffects(item) {
  let healthPenalty = 0;
  let stressPenalty = 0;

  for (const diseaseCase of item.diseases) {
    const disease = diseaseDatabase[diseaseCase.id];
    if (!disease) continue;
    const stage = getDiseaseStage(disease, diseaseCase.severity);
    healthPenalty += stage.healthImpact;
    stressPenalty += stage.stressImpact;
  }

  for (const symptomId of item.symptoms) {
    const symptom = symptomDatabase[symptomId];
    if (!symptom) continue;
    healthPenalty += symptom.healthImpact;
    stressPenalty += symptom.stressImpact;
  }

  item.visibleHealth = Math.max(0, item.health - healthPenalty);
  item.visibleStress = Math.min(100, item.stress + stressPenalty);
}

export function updateDiseases(item, elapsedDays, tanks, addLog) {
  for (const diseaseCase of [...item.diseases]) {
    const disease = diseaseDatabase[diseaseCase.id];
    if (!disease) continue;
    if ((diseaseCase.treatmentTime ?? 0) > 2) diseaseCase.treatmentTime = healthTuning.treatmentLegacyCapDays;

    const waterQuality = tanks[item.tank].waterQuality;
    const robustFactor = item.traits.includes("robustni") ? healthTuning.robustDiseaseFactor : 1;
    const goodWaterRecovery = waterQuality > 0.88 ? disease.goodWaterBonus : 0;
    const treatmentStrength = diseaseCase.treatmentTime > 0 ? disease.treatmentRate : 0;
    const quarantineFactor = item.tank === "quarantine" ? disease.quarantineBonus : 1;
    const immunity = Math.max(0, Math.min(100, item.geneticHealth?.immunity ?? pedigreeConfig.founderStats.immunity));
    const immunityFactor = pedigreeConfig.diseaseProgressAtZeroImmunity
      + (pedigreeConfig.diseaseProgressAtFullImmunity - pedigreeConfig.diseaseProgressAtZeroImmunity) * immunity / 100;
    const progress = disease.progressRate * robustFactor * immunityFactor * (1.05 - waterQuality);
    const recovery = disease.recoveryRate * goodWaterRecovery + treatmentStrength * quarantineFactor;

    diseaseCase.severity += (progress - recovery) * elapsedDays;
    diseaseCase.treatmentTime = Math.max(0, diseaseCase.treatmentTime - elapsedDays);
    diseaseCase.severity = Math.max(0, Math.min(100, diseaseCase.severity));

    const stageName = getDiseaseStage(disease, diseaseCase.severity).name;
    if (stageName !== diseaseCase.loggedStage) {
      diseaseCase.loggedStage = stageName;
      addLog(`${item.name}: ${disease.name}, faze ${stageName}.`);
    }

    if (diseaseCase.severity <= 0) {
      item.diseases = item.diseases.filter((activeCase) => activeCase !== diseaseCase);
      addLog(`${item.name}: priznaky ${disease.name} ustoupily.`);
    }
  }
}

export function getAppetiteFactor(item) {
  let factor = 1;
  for (const diseaseCase of item.diseases) {
    const disease = diseaseDatabase[diseaseCase.id];
    if (!disease) continue;
    factor = Math.min(factor, getDiseaseStage(disease, diseaseCase.severity).appetite);
  }
  return factor;
}

export function hasBreedingBlock(item) {
  return item.diseases.some((diseaseCase) => {
    const disease = diseaseDatabase[diseaseCase.id];
    if (!disease) return false;
    return getDiseaseStage(disease, diseaseCase.severity).breedingBlocked;
  });
}

export function spreadContagiousDiseases(elapsedDays, fish, addLog) {
  contagionTimer += elapsedDays;
  if (contagionTimer < healthTuning.contagiousCheckDays) return;
  contagionTimer = 0;

  for (const sourceFish of fish) {
    for (const diseaseCase of sourceFish.diseases) {
      const disease = diseaseDatabase[diseaseCase.id];
      if (!disease) continue;
      const stage = getDiseaseStage(disease, diseaseCase.severity);
      if (!stage.contagious) continue;

      const candidates = fish.filter(
        (item) =>
          item.tank === sourceFish.tank &&
          item.id !== sourceFish.id &&
          !item.diseases.some((activeCase) => activeCase.id === diseaseCase.id)
      );
      if (candidates.length === 0) continue;
      if (Math.random() > healthTuning.contagiousChance) continue;

      const target = candidates[Math.floor(Math.random() * candidates.length)];
      infectFish(target, diseaseCase.id, healthTuning.diseaseTransmissionSeverity);
      addLog(`${target.name}: mozne nakazeni od ${sourceFish.name}.`);
    }
  }
}

export function exposeTankToTrouble(sourceId, fish, currentTank, addLog) {
  const source = troubleSources[sourceId];
  if (!source || Math.random() > source.chance) return false;

  const vulnerableFish = fish.filter((item) => item.tank === currentTank && item.symptoms.length < healthTuning.maxPassiveSymptoms);
  if (vulnerableFish.length === 0) return false;

  const target = vulnerableFish[Math.floor(Math.random() * vulnerableFish.length)];
  if (source.diseases && source.diseases.length > 0 && Math.random() < healthTuning.sourceDiseaseChance) {
    const diseaseId = source.diseases[Math.floor(Math.random() * source.diseases.length)];
    infectFish(target, diseaseId, 14);
    addLog(`${source.log} ${target.name}: sledovat v karantene.`);
    return true;
  }

  const symptomId = source.symptoms[Math.floor(Math.random() * source.symptoms.length)];
  addSymptom(target, symptomId);
  addLog(`${source.log} ${target.name}: ${symptomDatabase[symptomId].name}.`);
  return true;
}

export function addSymptom(item, symptomId) {
  if (item.symptoms.includes(symptomId)) return;
  item.symptoms.push(symptomId);
  updateTroubleEffects(item);
}

export function infectFish(item, diseaseId, severity) {
  const activeCase = item.diseases.find((diseaseCase) => diseaseCase.id === diseaseId);
  if (activeCase) {
    activeCase.severity = Math.min(100, activeCase.severity + severity * healthTuning.reinfectionSeverityFactor);
    return;
  }

  const disease = diseaseDatabase[diseaseId];
  item.diseases.push({
    id: diseaseId,
    severity,
    treatmentTime: 0,
    loggedStage: getDiseaseStage(disease, severity).name,
  });
  updateTroubleEffects(item);
}

export function describeHealth(item) {
  if (item.diseases.length > 0) {
    const diseaseCase = item.diseases[0];
    const disease = diseaseDatabase[diseaseCase.id];
    return getDiseaseStage(disease, diseaseCase.severity).observation;
  }
  if (item.symptoms.length > 0) return symptomDatabase[item.symptoms[0]].observation;
  if (item.health < healthTuning.healthLabels.badBelow) return "Vypada spatne.";
  if (item.health < healthTuning.healthLabels.reducedBelow) return item.healthNote || "Nevypada uplne dobre.";
  return item.healthNote || "Vypada dobre.";
}

export function describeStress(stress) {
  if (stress < healthTuning.stressLabels.calmBelow) return "Klidna";
  if (stress < healthTuning.stressLabels.uneasyBelow) return "Neklidna";
  return "Vystresovana";
}

export { diseaseDatabase, symptomDatabase };
