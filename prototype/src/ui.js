import { diseaseDatabase, symptomDatabase } from "./systems/healthSystem.js";
import { describeHealth, describeStress, getActiveSymptoms, getDiseaseStage } from "./systems/healthSystem.js";

const traitInfo = {
  klidna: ["Klidna", "Pomaleji se stresuje."], skvrnita: ["Skvrnita", "Vyrazny dedicny vzor."],
  nocni: ["Nocni", "Aktivnejsi za sera."], stihla: ["Stihla", "Rychla telesna stavba."],
  hlubinna: ["Hlubinna", "Vyhledava spodni cast nadrze."], necitelna: ["Necitelna", "Jeji stav se hur odhaduje."],
  elektricka: ["Elektricka", "Nese svetelny znak."], ostra: ["Ostra", "Vyrazne obranne ploutve."],
  plodna: ["Plodna", "Vyssi chovna hodnota."], robustni: ["Robustni", "Lepe zvlada nemoci."],
  jeskynni: ["Jeskynni", "Adaptovana na slabe svetlo."], slepa: ["Slepa", "Orientuje se jinymi smysly."],
  echolokacni: ["Echolokacni", "V klidne nadrzi rychleji odbourava stres."],
};

export function createUi() {
  const ui = {
    fishName: document.getElementById("fishName"),
    fishSpecies: document.getElementById("fishSpecies"),
    fishHealth: document.getElementById("fishHealth"),
    fishStress: document.getElementById("fishStress"),
    fishHunger: document.getElementById("fishHunger"),
    fishAge: document.getElementById("fishAge"),
    fishRarity: document.getElementById("fishRarity"),
    fishSex: document.getElementById("fishSex"),
    fishParents: document.getElementById("fishParents"),
    fishOffspring: document.getElementById("fishOffspring"),
    fishHistory: document.getElementById("fishHistory"),
    tankLabel: document.getElementById("tankLabel"),
    tankName: document.getElementById("tankName"),
    traitList: document.getElementById("traitList"),
    symptomList: document.getElementById("symptomList"),
    journalLog: document.getElementById("journalLog"),
    moveFishButton: document.getElementById("moveFishButton"),
    treatFishButton: document.getElementById("treatFishButton"),
    breedFishButton: document.getElementById("breedFishButton"),
    sellFishButton: document.getElementById("sellFishButton"),
    tankTabs: [...document.querySelectorAll(".tank-tab")],
    appShell: document.querySelector(".app-shell"),
    heldCursor: document.getElementById("heldCursor"),
    gameDay: document.getElementById("gameDay"),
    gameTime: document.getElementById("gameTime"),
    waterQuality: document.getElementById("waterQuality"),
    coinCount: document.getElementById("coinCount"),
    currentTask: document.getElementById("currentTask"),
    journalCount: document.getElementById("journalCount"),
  };
  restoreJournal(ui);
  return ui;
}

export function addLog(ui, text) {
  if (isImportantEvent(text)) addJournalEntry(ui, text);
}

export function addJournalEntry(ui, text) {
  const important = isImportantEvent(text);
  const entry = document.createElement("li");
  entry.textContent = text;
  entry.classList.toggle("important", important);
  ui.journalLog.prepend(entry);
  while (ui.journalLog.children.length > 40) {
    ui.journalLog.lastElementChild.remove();
  }
  persistJournal(ui);
  updateJournalCount(ui);
}

const JOURNAL_KEY = "beta-fish-game.journal.v1";

function isImportantEvent(text) {
  return /jik|vylihl|narozen|nemoc|nakaz|lec|prodej|prodano|odemc|uhyn|karanten|poter/i.test(text);
}

function persistJournal(ui) {
  const entries = [...ui.journalLog.children].map((entry) => ({ text: entry.textContent, important: entry.classList.contains("important") }));
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
}

function restoreJournal(ui) {
  try {
    const entries = JSON.parse(localStorage.getItem(JOURNAL_KEY) ?? "[]");
    for (const saved of entries.slice().reverse()) {
      const entry = document.createElement("li");
      entry.textContent = saved.text;
      entry.classList.toggle("important", Boolean(saved.important));
      ui.journalLog.prepend(entry);
    }
  } catch {}
  updateJournalCount(ui);
}

function updateJournalCount(ui) {
  if (!ui.journalCount) return;
  const count = ui.journalLog.children.length;
  ui.journalCount.textContent = `${count} ${count === 1 ? "zaznam" : "zaznamu"}`;
}

export function renderFishCard(ui, item) {
  ui.appShell.classList.add("show-card");
  ui.fishName.textContent = item.name;
  ui.fishSpecies.textContent = item.species;
  ui.fishAge.textContent = item.age;
  ui.fishRarity.textContent = item.rarity;
  ui.appShell.dataset.rarity = item.rarity.toLowerCase();
  ui.fishSex.textContent = item.sex ?? "nezname";
  ui.fishParents.textContent = item.parents?.length ? item.parents.join(", ") : "neznamí";
  ui.fishOffspring.textContent = String(item.offspring?.length ?? 0);
  ui.traitList.innerHTML = "";
  renderFishHistory(ui, item);

  for (const trait of item.traits) {
    const tag = document.createElement("span");
    tag.className = "trait";
    const info = traitInfo[trait] ?? [trait, "Dedicna vlastnost ryby."];
    tag.textContent = info[0];
    tag.title = info[1];
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
  ui.fishSex.textContent = "-";
  ui.fishParents.textContent = "-";
  ui.fishOffspring.textContent = "-";
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
  ui.breedFishButton.disabled = !hasFish || item.tank === "nursery" || item.tank === "sale";
  ui.breedFishButton.textContent = item?.tank === "nursery" ? "Ve treci nadrzi" : "Presunout do treni";
  ui.sellFishButton.disabled = !hasFish || item.lifeStage === "fry" || item.diseases.length > 0 || item.tank === "sale";
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
