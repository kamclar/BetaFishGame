import { diseaseDatabase, symptomDatabase } from "./systems/healthSystem.js";
import { describeHealth, describeStress, getActiveSymptoms, getDiseaseStage } from "./systems/healthSystem.js";
import { categoryName } from "./data/speciesData.js";
import { alleleName, geneticFeatureKeys, hiddenGeneRows, inheritedFeatureLabels } from "./systems/lineageSystem.js";
import { csStoryUi } from "./i18n/csStory.js";
import { colorLineForFish } from "./config/colorLineConfig.js";

const traitInfo = {
  klidna: ["Klidna", "Pomaleji se stresuje."], skvrnita: ["Skvrnita", "Vyrazny dedicny vzor."],
  nocni: ["Nocni", "Aktivnejsi za sera."], stihla: ["Stihla", "Rychla telesna stavba."],
  hlubinna: ["Hlubinna", "Vyhledava spodni cast nadrze."], necitelna: ["Necitelna", "Jeji stav se hur odhaduje."],
  elektricka: ["Elektricka", "Nese svetelny znak."], ostra: ["Ostra", "Vyrazne obranne ploutve."],
  plodna: ["Plodna", "Vyssi chovna hodnota."], robustni: ["Robustni", "Lepe zvlada nemoci."],
  jeskynni: ["Jeskynni", "Adaptovana na slabe svetlo."], slepa: ["Slepa", "Orientuje se jinymi smysly."],
  echolokacni: ["Echolokacni", "V klidne nadrzi rychleji odbourava stres."],
  neznamyVyrustek: ["Neznamy vyrustek", "Dedicny znak, ktery atlas nedokaze zaradit."],
  hlubinnaOdezva: ["Hlubinna odezva", "Po setmeni reaguje na neznamy podnet."],
  promenenyOcas: ["Promeneny ocas", "Okraj ploutve se rozdělil do samostatne se pohybujicich laloku."],
  druheOci: ["Druhe oci", "Dve drobne oci se otevřely az v dalsi generaci."],
  ociPodKuzi: ["Oci pod kuzi", "Dalsi oci se oteviraji jen na kratky okamzik."],
  nehybnyPohled: ["Nehybny pohled", "Puvodni klid se zmenil v dlouhe nehybne pozorovani."],
  putujiciKresba: ["Putujici kresba", "Skvrny po setmeni pomalu meni polohu."],
  bezesny: ["Bezesny", "Ryba neprechazi do bezneho nocniho klidu."],
  hadovityPohyb: ["Hadovity pohyb", "Telo se pri plavani vlni v nezvyklem rytmu."],
  slysiHlubiny: ["Slysi hlubiny", "Otaci se za zvukem, ktery neni slyset."],
  prazdnyOdraz: ["Prazdny odraz", "Ve skle se jeji oko nekdy neodrazi."],
  studeneSvetlo: ["Studene svetlo", "Zare nereaguje na bezne osvetleni nadrze."],
  kostenePaprsky: ["Kostene paprsky", "Mekke ploutve nahradily tvrde clenene vyrustky."],
  ciziSnuska: ["Cizi snuska", "Jikry se vyvijeji jinak nez u puvodni linie."],
  ciziMetabolismus: ["Cizi metabolismus", "Potrebuje mene potravy, ale citliveji reaguje na vodu."],
  vidiZaSklem: ["Vidi za sklem", "Sleduje pohyb i mimo osvetlenou cast nadrze."],
  vnitrniZrak: ["Vnitrni zrak", "Slepa linie zacala reagovat drive, nez se podnet objevi."],
  mnohooci: ["Mnohooci", "Drobne oci sleduji ruzne smery nezavisle."],
  volaniHlubin: ["Volani hlubin", "Jeji linie muze ukryvat dalsi neznamy stupen."],
  krehkaLinie: ["Krehka linie", "Projeveny recesivni znak snizuje dlouhodobou odolnost linie."],
};

export function createUi() {
  const ui = {
    fishName: document.getElementById("fishName"),
    fishSpecies: document.getElementById("fishSpecies"),
    fishPortrait: document.getElementById("fishPortrait"),
    fishHealth: document.getElementById("fishHealth"),
    fishStress: document.getElementById("fishStress"),
    fishHunger: document.getElementById("fishHunger"),
    fishAge: document.getElementById("fishAge"),
    fishRarity: document.getElementById("fishRarity"),
    fishColorLine: document.getElementById("fishColorLine"),
    fishSex: document.getElementById("fishSex"),
    fishCategory: document.getElementById("fishCategory"),
    fishBehavior: document.getElementById("fishBehavior"),
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
    waterReadings: document.getElementById("waterReadings"),
    coinCount: document.getElementById("coinCount"),
    skillStatus: document.getElementById("skillStatus"),
    currentTask: document.getElementById("currentTask"),
    customerContract: document.getElementById("customerContract"),
    journalCount: document.getElementById("journalCount"),
    dailyGoalList: document.getElementById("dailyGoalList"),
    fishCard: document.querySelector(".fish-card"),
    fishPageTabs: [...document.querySelectorAll("[data-fish-page]")],
    pedigreePage: document.getElementById("pedigreePage"),
    atlasPage: document.getElementById("atlasPage"),
    storyChapters: document.getElementById("storyChapters"),
    journalPageTabs: [...document.querySelectorAll("[data-journal-page]")],
    journalPages: [...document.querySelectorAll("[data-journal-content]")],
    tutorialPanel: document.getElementById("tutorialPanel"),
    tutorialProgress: document.getElementById("tutorialProgress"),
    tutorialTitle: document.getElementById("tutorialTitle"),
    tutorialText: document.getElementById("tutorialText"),
    tutorialContinue: document.getElementById("tutorialContinue"),
    tutorialSkip: document.getElementById("tutorialSkip"),
  };
  restoreJournal(ui);
  return ui;
}

export function renderTutorial(ui, step) {
  document.querySelectorAll(".tutorial-focus").forEach((element) => element.classList.remove("tutorial-focus"));
  ui.tutorialPanel.hidden = !step;
  if (!step) return;
  ui.tutorialProgress.textContent = step.progress;
  ui.tutorialTitle.textContent = step.title;
  ui.tutorialText.textContent = step.text;
  ui.tutorialContinue.textContent = step.button ?? "";
  ui.tutorialContinue.hidden = !step.button;
  ui.tutorialSkip.textContent = step.skipLabel;
  ui.tutorialSkip.hidden = !step.canSkip;
  document.querySelector(step.target)?.classList.add("tutorial-focus");
}

export function setJournalPage(ui, page) {
  for (const tab of ui.journalPageTabs) tab.classList.toggle("active", tab.dataset.journalPage === page);
  for (const content of ui.journalPages) content.classList.toggle("active", content.dataset.journalContent === page);
}

export function renderStoryChapters(ui, chapters) {
  ui.storyChapters.innerHTML = "";
  for (const chapter of chapters) {
    const article = document.createElement("article");
    article.className = `story-chapter ${chapter.unlocked ? "unlocked" : "locked"}`;
    if (chapter.unlocked) {
      const date = document.createElement("p"); date.className = "story-date"; date.textContent = chapter.date;
      const title = document.createElement("h3"); title.textContent = chapter.title;
      article.append(date, title);
      for (const paragraph of chapter.text.split(/\n\s*\n/)) {
        const text = document.createElement("p"); text.textContent = paragraph; article.appendChild(text);
      }
      const hint = document.createElement("small"); hint.textContent = `${csStoryUi.marginNote}: ${chapter.hint}`; article.appendChild(hint);
    } else {
      const title = document.createElement("h3"); title.textContent = csStoryUi.missingPage;
      const hint = document.createElement("p"); hint.textContent = chapter.hint;
      article.append(title, hint);
    }
    ui.storyChapters.appendChild(article);
  }
}

export function renderDailyGoals(ui, goals) {
  if (!ui.dailyGoalList) return;
  ui.dailyGoalList.innerHTML = "";
  for (const goal of goals ?? []) {
    const item = document.createElement("li");
    item.classList.toggle("completed", Boolean(goal.completed));
    item.textContent = `${goal.completed ? "✓" : "·"} ${goal.label} ${goal.progress}/${goal.target} · ${goal.reward} penez · +${goal.skillXp ?? goal.reputation ?? 0} zkus.`;
    ui.dailyGoalList.appendChild(item);
  }
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
  setFishCardPage(ui, "overview");
  ui.fishName.textContent = item.name;
  ui.fishSpecies.textContent = item.species;
  ui.fishAge.textContent = item.age;
  ui.fishRarity.textContent = item.rarity;
  const colorLine = colorLineForFish(item);
  ui.fishColorLine.textContent = colorLine ? `${colorLine.name} · ${colorLine.rarity}` : "Bez pojmenovane linie";
  ui.appShell.dataset.rarity = item.rarity.toLowerCase();
  ui.fishSex.textContent = item.sex ?? "nezname";
  ui.fishCategory.textContent = categoryName(item.category);
  ui.fishBehavior.textContent = item.behaviorState ?? "pozoruje okoli";
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

export function setFishCardPage(ui, page) {
  ui.fishCard.dataset.page = page;
  for (const tab of ui.fishPageTabs) tab.classList.toggle("active", tab.dataset.fishPage === page);
}

export function renderPedigreePage(ui, item, allFish, onSelect, archive = {}) {
  ui.pedigreePage.innerHTML = "";
  const addFamily = (title, ids) => {
    const section = document.createElement("section");
    section.innerHTML = `<h3>${title}</h3>`;
    const list = document.createElement("div"); list.className = "relative-list";
    for (const id of ids ?? []) {
      const relative = allFish.find((fish) => fish.id === id);
      const record = archive[id];
      if (!relative) { const missing = document.createElement("span"); missing.textContent = record ? `${record.name} · ${record.species} (mimo chov)` : "Neznamy"; list.appendChild(missing); continue; }
      const button = document.createElement("button"); button.type = "button";
      button.textContent = `${relative.name} · ${relative.species}`;
      button.addEventListener("click", () => onSelect(relative)); list.appendChild(button);
    }
    if (!list.children.length) list.textContent = "Bez zaznamu.";
    section.appendChild(list); ui.pedigreePage.appendChild(section);
  };
  addFamily("Rodice", item.parents);
  addFamily("Potomci", item.offspring);
  const health = item.geneticHealth;
  if (health) {
    const geneticHealth = document.createElement("section");
    geneticHealth.innerHTML = `<h3>Geneticke zdravi</h3><dl>
      <div><dt>Vitalita</dt><dd>${Math.round(health.vitality)}/100</dd></div>
      <div><dt>Imunita</dt><dd>${Math.round(health.immunity)}/100</dd></div>
      <div><dt>Plodnost</dt><dd>${Math.round(health.fertility)}/100</dd></div>
      <div><dt>Rozmanitost genu</dt><dd>${Math.round(health.heterozygosity * 100)} %</dd></div>
      <div><dt>Pribuzenske krizeni</dt><dd>${(health.inbreedingCoefficient * 100).toFixed(1)} %</dd></div>
      <div><dt>Riziko recesivni vady</dt><dd>${(health.defectRisk * 100).toFixed(1)} %</dd></div>
    </dl>`;
    ui.pedigreePage.appendChild(geneticHealth);
  }
  const inheritance = document.createElement("section"); inheritance.innerHTML = "<h3>Zdedene casti</h3>";
  const genes = document.createElement("dl");
  for (const [key, label] of Object.entries(inheritedFeatureLabels)) {
    const alleles = item.genetics?.[`${key}Alleles`];
    const legacyParentId = item.genetics?.[`${key}From`];
    const sources = Array.isArray(alleles)
      ? alleles.map(({ parentId }) => allFish.find((fish) => fish.id === parentId)?.name ?? archive[parentId]?.name ?? "Neznamy rodic")
      : [allFish.find((fish) => fish.id === legacyParentId)?.name ?? archive[legacyParentId]?.name ?? "Neznamy puvod"];
    const row = document.createElement("div"); row.innerHTML = `<dt>${label}</dt><dd>${sources.join(" + ")}</dd>`; genes.appendChild(row);
  }
  inheritance.appendChild(genes); ui.pedigreePage.appendChild(inheritance);
  const hiddenSection = document.createElement("section"); hiddenSection.innerHTML = "<h3>Skryte geny</h3>";
  const hiddenGenes = document.createElement("dl"); hiddenGenes.className = "hidden-genes";
  for (const gene of hiddenGeneRows(item)) {
    const row = document.createElement("div");
    row.innerHTML = `<dt>${gene.label}</dt><dd><span>${gene.visible}</span> / <b class="${gene.revealed ? "revealed" : "unknown"}">${gene.hidden}</b></dd>`;
    hiddenGenes.appendChild(row);
  }
  hiddenSection.appendChild(hiddenGenes); ui.pedigreePage.appendChild(hiddenSection);
}

export function renderAtlasPage(ui, sections, observedFish = [], page = "fish", drawThumbnail = null) {
  ui.atlasPage.innerHTML = "";
  const found = sections.reduce((sum, section) => sum + section.entries.filter((entry) => entry.discovered).length, 0);
  const summary = document.createElement("div"); summary.className = "atlas-summary";
  summary.innerHTML = page === "fish"
    ? `<strong>${observedFish.length}</strong><span>pozorovaných ryb</span>`
    : `<strong>${found}</strong><span>objevených znaků</span>`;
  ui.atlasPage.appendChild(summary);
  if (page === "fish") {
    const gallery = document.createElement("div"); gallery.className = "atlas-fish-gallery";
    for (const fish of observedFish) {
      const card = document.createElement("article"); card.className = "atlas-fish-entry";
      const preview = document.createElement("canvas"); preview.width = 150; preview.height = 82;
      if (drawThumbnail) drawThumbnail(preview, fish);
      const title = document.createElement("h3"); title.textContent = fish.name ?? "Nepojmenovaná ryba";
      const species = document.createElement("p"); species.textContent = fish.species ?? "Neznámá linie";
      const traits = document.createElement("small");
      traits.textContent = geneticFeatureKeys.map((key) => alleleName(key, fish[key])).join(" · ");
      card.append(preview, title, species, traits); gallery.appendChild(card);
    }
    if (!observedFish.length) gallery.innerHTML = '<p class="atlas-empty">Zatím tu není žádná pozorovaná ryba.</p>';
    ui.atlasPage.appendChild(gallery);
    return;
  }
  for (const section of sections) {
    const discovered = section.entries.filter((entry) => entry.discovered);
    if (!discovered.length) continue;
    const block = document.createElement("section");
    block.innerHTML = `<h3>${section.label} <small>${discovered.length} objeveno</small></h3>`;
    const entries = document.createElement("div"); entries.className = "atlas-entries";
    for (const entry of discovered) {
      const tag = document.createElement("span");
      tag.innerHTML = `<b>${entry.name}</b><small>${entry.sightings ? `pozorováno u ${entry.sightings} ryb` : "starší záznam"}</small>`;
      entries.appendChild(tag);
    }
    block.appendChild(entries); ui.atlasPage.appendChild(block);
  }
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
  ui.fishColorLine.textContent = "-";
  ui.fishSex.textContent = "-";
  ui.fishCategory.textContent = "-";
  ui.fishBehavior.textContent = "-";
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
  ui.fishBehavior.textContent = item.behaviorState ?? "pozoruje okoli";
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
