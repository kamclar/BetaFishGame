import { diseaseDatabase, symptomDatabase } from "./systems/healthSystem.js";
import { describeHealth, describeStress, getActiveSymptoms, getDiseaseStage } from "./systems/healthSystem.js";

export function createUi() {
  return {
    fishName: document.getElementById("fishName"),
    fishSpecies: document.getElementById("fishSpecies"),
    fishHealth: document.getElementById("fishHealth"),
    fishStress: document.getElementById("fishStress"),
    fishHunger: document.getElementById("fishHunger"),
    fishAge: document.getElementById("fishAge"),
    fishRarity: document.getElementById("fishRarity"),
    fishHistory: document.getElementById("fishHistory"),
    tankLabel: document.getElementById("tankLabel"),
    tankName: document.getElementById("tankName"),
    traitList: document.getElementById("traitList"),
    symptomList: document.getElementById("symptomList"),
    journalLog: document.getElementById("journalLog"),
    moveFishButton: document.getElementById("moveFishButton"),
    treatFishButton: document.getElementById("treatFishButton"),
    tankTabs: [...document.querySelectorAll(".tank-tab")],
    appShell: document.querySelector(".app-shell"),
    heldCursor: document.getElementById("heldCursor"),
    gameDay: document.getElementById("gameDay"),
    gameTime: document.getElementById("gameTime"),
    waterQuality: document.getElementById("waterQuality"),
    coinCount: document.getElementById("coinCount"),
    currentTask: document.getElementById("currentTask"),
  };
}

export function addLog(_ui, _text) {}

export function addJournalEntry(ui, text) {
  const entry = document.createElement("li");
  entry.textContent = text;
  ui.journalLog.prepend(entry);
  while (ui.journalLog.children.length > 40) {
    ui.journalLog.lastElementChild.remove();
  }
}

export function renderFishCard(ui, item) {
  ui.appShell.classList.add("show-card");
  ui.fishName.textContent = item.name;
  ui.fishSpecies.textContent = item.species;
  ui.fishAge.textContent = item.age;
  ui.fishRarity.textContent = item.rarity;
  ui.traitList.innerHTML = "";
  renderFishHistory(ui, item);

  for (const trait of item.traits) {
    const tag = document.createElement("span");
    tag.className = "trait";
    tag.textContent = trait;
    ui.traitList.appendChild(tag);
  }

  refreshFishCard(ui, item);
}

export function clearFishCard(ui) {
  ui.appShell.classList.remove("show-card");
  ui.fishName.textContent = "Zadna ryba";
  ui.fishSpecies.textContent = "Tahle nadrz je prazdna.";
  ui.fishHealth.textContent = "-";
  ui.fishStress.textContent = "-";
  ui.fishHunger.textContent = "-";
  ui.fishAge.textContent = "-";
  ui.fishRarity.textContent = "-";
  ui.traitList.innerHTML = "";
  ui.symptomList.innerHTML = "";
  ui.fishHistory.innerHTML = "";
  updateFishActionButtons(ui, null);
}

export function addFishHistory(ui, item, text) {
  item.history.unshift(text);
  while (item.history.length > 12) item.history.pop();
  renderFishHistory(ui, item);
}

export function refreshFishCard(ui, item) {
  if (!item) return;
  ui.fishHealth.textContent = describeHealth(item);
  ui.fishStress.textContent = describeStress(item.visibleStress ?? item.stress);
  ui.fishHunger.textContent = `${Math.round(item.hunger)}%`;
  ui.fishAge.textContent = `${item.age}, ${item.stageName}`;
  renderSymptoms(ui, item);
  updateFishActionButtons(ui, item);
}

export function updateTankTabs(ui, tanks, currentTank) {
  ui.tankLabel.textContent = tanks[currentTank].label;
  ui.tankName.textContent = tanks[currentTank].name;
  for (const tab of ui.tankTabs) {
    tab.classList.toggle("active", tab.dataset.tank === currentTank);
  }
}

function renderSymptoms(ui, item) {
  ui.symptomList.innerHTML = "";

  for (const diseaseCase of item.diseases) {
    const disease = diseaseDatabase[diseaseCase.id];
    if (!disease) continue;
    const stage = getDiseaseStage(disease, diseaseCase.severity);
    const tag = document.createElement("span");
    tag.className = "symptom";
    tag.textContent = `${disease.name}: ${stage.name}`;
    ui.symptomList.appendChild(tag);
  }

  for (const symptomId of getActiveSymptoms(item)) {
    const symptom = symptomDatabase[symptomId];
    if (!symptom) continue;
    const tag = document.createElement("span");
    tag.className = "symptom";
    tag.textContent = symptom.name;
    ui.symptomList.appendChild(tag);
  }
}

function updateFishActionButtons(ui, item) {
  const hasFish = Boolean(item);
  ui.moveFishButton.disabled = !hasFish;
  ui.treatFishButton.disabled = !hasFish || (item.symptoms.length === 0 && item.diseases.length === 0);
  if (!hasFish) {
    ui.moveFishButton.textContent = "Presunout do karanteny";
    return;
  }
  ui.moveFishButton.textContent =
    item.tank === "main" ? "Presunout do karanteny" : "Vratit do hlavni nadrze";
}

function renderFishHistory(ui, item) {
  ui.fishHistory.innerHTML = "";
  for (const entry of item.history.slice(0, 7)) {
    const li = document.createElement("li");
    li.textContent = entry;
    ui.fishHistory.appendChild(li);
  }
}
