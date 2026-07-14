import { drawAquarium, drawDayNightOverlay, drawFoodParticles, drawGlass, drawGlassAlgae, drawLiquidClouds, drawSaleEffects } from "./art/aquariumArt.js";
import { getGlassBounds, getSurfaceY, maskAquariumEdges } from "./art/aquariumArt.js";
import { drawFish } from "./art/fishArt.js";
import { fishRenderScale } from "./art/fishArt.js";
import { loadFishSpriteAssets } from "./art/spriteAssets.js";
import { ensureStarterSchool, fish, palette, plants, tanks } from "./data/fishData.js";
import { applySpeciesMetadata } from "./data/speciesData.js";
import { createPlant, plantTypes, plantTypeOrder } from "./data/plantData.js";
import { diseaseDatabase } from "./data/healthData.js";
import { initializeLifecycle, updateLifecycle } from "./systems/lifecycleSystem.js";
import { applyTankEffects, changeWater, ensureWaterChemistry, formatCompactWaterTest, formatGameTime, formatWaterTest, gameClock, scrapeAlgae, updateWorld, vacuumTank, waterTestAdvice, waterTestResult } from "./systems/tankSystem.js";
import { actionCosts, addSkillExperience, addSupply, canAfford, consumeSupply, economy, ensureDailyGoals, initializeEconomy, isShopUnlocked, payForAction, recordAction, shopUnlocks, skillInfo, supplyCount, taskText } from "./systems/economySystem.js";
import { clearSavedGame, loadGame, restoreArray, restoreObject, saveGame } from "./systems/saveSystem.js";
import { t } from "./i18n/index.js";
import { addMysteryEggs, initializeBreeding, updateSpawning } from "./systems/breedingSystem.js";
import { prepareForSale, startLiveSales, updateLiveSales } from "./systems/salesSystem.js";
import { contractText, ensureContract, recordContractSale } from "./systems/contractSystem.js";
import { createCombinedEldritchPreview, eldritchJournalEntry } from "./systems/eldritchSystem.js";
import { discoverLineageFeatures, lineageAtlasSections } from "./systems/lineageSystem.js";
import { initializePedigreeArchive, pairingAssessment, registerFishPedigree } from "./systems/pedigreeSystem.js";
import { initializeStory, recordStoryAction, storyChapters, updateStory } from "./systems/storySystem.js";
import { gameDaysElapsed } from "./systems/timeSystem.js";
import { dayPeriod, daylightAt, updateFishBehavior } from "./systems/behaviorSystem.js";
import { advanceTutorial, currentTutorialStep, initializeTutorial, skipTutorial } from "./systems/tutorialSystem.js";
import { hungerConfig, treatmentDurationDays } from "./config/fishConfig.js";
import { supplyPackSizes } from "./config/economyConfig.js";
import { waterConfig } from "./config/waterConfig.js";
import {
  exposeTankToTrouble,
  getActiveSymptoms,
  getAppetiteFactor,
  hasBreedingBlock,
  spreadContagiousDiseases,
  updateDiseases,
  updateTroubleEffects,
} from "./systems/healthSystem.js";
import { addFishHistory, addJournalEntry, addLog, clearFishCard, createUi, refreshFishCard, renderAtlasPage, renderDailyGoals, renderFishCard, renderPedigreePage, renderStoryChapters, renderTutorial, setFishCardPage, setJournalPage, updateTankTabs } from "./ui.js";

const canvas = document.getElementById("aquarium");
const ctx = canvas.getContext("2d");
const ui = createUi();
const hudToggle = document.getElementById("hudToggle");
loadFishSpriteAssets();
restoreSavedGame();
const existingEldritchPreview = fish.find((item) => item.id === "eldritch-preview-stage-4");
if (existingEldritchPreview) {
  Object.assign(existingEldritchPreview, {
    color: "eldritch",
    body: "diamond",
    tail: "eldritch",
    dorsalFin: "spiky",
    ventralFin: "eldritch",
    pattern: "glow",
    specialSprite: null,
    eldritchStage: 4,
  });
} else {
  fish.push(createCombinedEldritchPreview());
}
initializeEconomy(gameClock.day);
initializeTutorial(economy);
if (!economy.starterSchoolAdded) {
  ensureStarterSchool(fish);
  economy.starterSchoolAdded = true;
}
migrateBiologicalClock();
initializeStory(economy);
for (const [tankId, tank] of Object.entries(tanks)) {
  tank.capacity = waterConfig.capacities[tankId] ?? waterConfig.capacities.fallback;
  ensureWaterChemistry(tank);
  if (tank.lastTest && tank.lastTest.oxygen == null) tank.lastTest = null;
}
applySpeciesMetadata(fish);
ensureContract(economy);
for (const item of fish) initializeLifecycle(item);
initializeBreeding(fish);
initializePedigreeArchive(economy, fish);
discoverLineageFeatures(economy, fish);
unlockStoryChapters();
for (const item of fish) item.traits = item.traits.map((trait) => trait === "ticha" ? "echolokacni" : trait);

let selectedFish = null;
let lastTime = performance.now();
let currentTank = "main";
let nextPlantX = 220;
let heldItem = null;
let pointer = { x: -100, y: -100 };
let toolAngle = 0;
let toolTargetAngle = 0;
let toolOverGlass = false;
let resettingGame = false;
let maintenanceDragging = false;
let siphonLoad = 0;
let lastSiphonCloudAt = 0;
const foodParticles = [];
const liquidClouds = [];
const debugMode = new URLSearchParams(location.search).has("debugTime");
document.body.classList.toggle("debug-mode", debugMode);

function setHudOpen(open) {
  ui.appShell.classList.toggle("hud-open", open);
  hudToggle.setAttribute("aria-expanded", String(open));
  hudToggle.title = open ? "Schovat horní panel" : "Otevřít horní panel";
  hudToggle.querySelector(".sr-only").textContent = hudToggle.title;
}

hudToggle.addEventListener("click", () => setHudOpen(!ui.appShell.classList.contains("hud-open")));

function refreshTutorial() {
  const step = currentTutorialStep(economy);
  if (step?.opensHud) setHudOpen(true);
  renderTutorial(ui, step);
}

function handleTutorialEvent(type, detail = "") {
  const event = detail ? `${type}:${detail}` : type;
  if (advanceTutorial(economy, event)) refreshTutorial();
}

ui.tutorialContinue.addEventListener("click", () => handleTutorialEvent("continue"));
ui.tutorialSkip.addEventListener("click", () => {
  skipTutorial(economy);
  refreshTutorial();
});
refreshTutorial();

function migrateBiologicalClock() {
  if ((economy.timeModelVersion ?? 0) >= 2) return;
  for (const item of fish) item.hunger = Math.min(item.hunger ?? 35, 45);
  economy.timeModelVersion = 2;
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * scale);
  canvas.height = Math.floor(rect.height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

function getView() {
  const rect = canvas.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

function getVisibleFish() {
  return fish.filter((item) => item.tank === currentTank);
}

function switchTank(tankId) {
  currentTank = tankId;
  updateTankTabs(ui, tanks, currentTank);
  selectedFish = null;
  clearFishCard(ui);
  addLog(ui, `Prepnuto: ${tanks[currentTank].name}.`);
}

function update(delta) {
  const elapsedDays = gameDaysElapsed(delta);
  const view = getView();
  updateFoodParticles(delta, view);
  updateLiquidClouds(delta);
  updateWorld(delta, tanks, plants, fish, (day) => {
    addJournalEntry(ui, t("event.day_started", { day }));
    if (ensureDailyGoals(day)) {
      renderDailyGoals(ui, economy.dailyGoals);
      addJournalEntry(ui, `Den ${day}: byly pripraveny tri nove chovatelske cile.`);
    }
  });
  updateSpawning(
    delta,
    tanks.nursery,
    fish,
    (parents) => {
      addJournalEntry(ui, `${parents[0].name} a ${parents[1].name}: ve treci nadrzi se objevily jikry.`);
      completeAction("breed");
    },
    (babies, parents) => {
      babies.forEach(initializeLifecycle);
      babies.forEach((baby) => registerFishPedigree(economy, baby));
      parents.forEach((parent) => registerFishPedigree(economy, parent));
      discoverLineageFeatures(economy, babies);
      const names = babies.map((baby) => baby.name).join(" a ");
      const message = parents.length === 2
        ? `Z jiker ryb ${parents[0].name} a ${parents[1].name} se vylihl poter: ${names}.`
        : `Ze zakoupenych jiker se vylihl poter: ${names}.`;
      addJournalEntry(ui, message);
      const anomalyEntry = eldritchJournalEntry(babies);
      if (anomalyEntry) addJournalEntry(ui, anomalyEntry);
    },
    { minute: gameClock.minute, waterQuality: tanks.nursery.waterQuality, debug: debugMode, pedigreeArchive: economy.pedigreeArchive }
  );
  updateLiveSales(delta, tanks.sale, fish, economy, (item, price) => {
    addJournalEntry(ui, `Zakaznik koupil rybu ${item.name} za ${price} penez.`);
    handleSkillChange(addSkillExperience((item.health ?? 0) >= 85 ? 2 : 1));
    completeAction("sell");
    const contractResult = recordContractSale(item, economy);
    if (contractResult) {
      handleSkillChange(addSkillExperience(contractResult.skillXp));
      addJournalEntry(ui, `Zakazka splnena. Bonus ${contractResult.reward} penez a +${contractResult.skillXp} zkusenosti.`);
    }
    if (selectedFish?.id === item.id) { selectedFish = null; clearFishCard(ui); }
  });
  unlockStoryChapters();

  for (const item of fish) {
    item.phase += delta * (0.55 + 2.45 * Math.max(0.12, item.activityLevel ?? 1));
    updateLifecycle(item, delta, (text) => addJournalEntry(ui, `Den ${Math.floor(item.ageDays)}: ${text}`));
    const appetite = getAppetiteFactor(item);
    const hungerPerDay = item.traits.includes("ciziMetabolismus") ? hungerConfig.eldritchPerDay : hungerConfig.normalPerDay;
    item.hunger = Math.min(100, item.hunger + elapsedDays * hungerPerDay);
    applyTankEffects(item, elapsedDays, tanks[item.tank]);
    updateDiseases(item, elapsedDays, tanks, (text) => addLog(ui, text));
    updateTroubleEffects(item);
    item.canBreed = item.canBreedByAge && !hasBreedingBlock(item);

    feedFishNearFood(item, appetite, delta);
  }

  spreadContagiousDiseases(elapsedDays, fish, (text) => addLog(ui, text));

  const visibleFish = getVisibleFish();
  const glass = getGlassBounds(view);
  const surfaceY = getSurfaceY(view);
  const floorY = view.height - 82;
  const foodPresent = foodParticles.some((particle) => particle.tank === currentTank);
  tanks[currentTank].lightLevel = daylightAt(gameClock.minute);
  tanks[currentTank].dayPeriod = dayPeriod(gameClock.minute);
  for (const item of visibleFish) {
    const bob = Math.sin(item.phase) * 9;
    const hungerBoost = item.hunger > hungerConfig.hungryMovementThreshold ? hungerConfig.hungryMovementMultiplier : 1;
    const behavior = updateFishBehavior(item, delta, { minute: gameClock.minute, tankFish: visibleFish, glass, surfaceY, floorY, foodPresent });
    item.x += item.dir * item.speed * (item.stageSpeed ?? 1) * hungerBoost * behavior.speedMultiplier * delta;
    item.y += Math.sin(item.phase * 0.7) * delta * 12 * Math.max(0.16, behavior.speedMultiplier);

    attractFishToFood(item, delta);

    const margin = 74 * item.size * (item.growthScale ?? 1) * fishRenderScale;
    if (item.x > glass.right - margin) {
      item.x = glass.right - margin;
      item.dir = -1;
    }
    if (item.x < glass.left + margin) {
      item.x = glass.left + margin;
      item.dir = 1;
    }

    item.y = Math.max(surfaceY + 18, Math.min(floorY, item.y + bob * delta * Math.max(0.12, behavior.speedMultiplier)));
  }
}

function draw() {
  const view = getView();
  ctx.clearRect(0, 0, view.width, view.height);
  drawAquarium(ctx, view, plants[currentTank], currentTank, tanks[currentTank]);

  const glass = getGlassBounds(view);
  ctx.save();
  ctx.beginPath();
  ctx.rect(glass.left, getSurfaceY(view) - 4, glass.width, view.height - getSurfaceY(view) + 4);
  ctx.clip();
  drawLiquidClouds(ctx, liquidClouds.filter((cloud) => cloud.tank === currentTank));
  drawFoodParticles(ctx, foodParticles.filter((particle) => particle.tank === currentTank));
  for (const item of getVisibleFish()) {
    drawFish(ctx, item, { palette, getActiveSymptoms, selectedFish });
  }
  if (currentTank === "sale") drawSaleEffects(ctx, tanks.sale);
  drawGlassAlgae(ctx, view, tanks[currentTank]);
  drawDayNightOverlay(ctx, view, daylightAt(gameClock.minute), dayPeriod(gameClock.minute));
  ctx.restore();

  maskAquariumEdges(ctx, view);
  drawGlass(ctx, view);
  refreshFishCard(ui, selectedFish);
  ui.gameDay.textContent = t("ui.day", { day: gameClock.day });
  ui.gameTime.textContent = `${formatGameTime()} · ${dayPeriod(gameClock.minute)}`;
  const lastWaterTest = tanks[currentTank].lastTest;
  ui.waterQuality.textContent = lastWaterTest
    ? t("ui.water", { quality: lastWaterTest.quality.toLowerCase() })
    : "Voda: nezměřená";
  ui.waterReadings.textContent = lastWaterTest
    ? `Poslední test: ${formatCompactWaterTest(lastWaterTest)}`
    : "Test vody: neproveden";
  ui.coinCount.textContent = t("ui.coins", { coins: economy.coins });
  const skill = skillInfo();
  ui.skillStatus.textContent = `Zkus. ${skill.value} · ${skill.name}`;
  document.getElementById("foodDoseCount").textContent = `${supplyCount("food")} davek`;
  ui.currentTask.textContent = taskText();
  ui.customerContract.textContent = contractText(ensureContract(economy));
}

function selectFish(item) {
  selectedFish = item;
  renderFishCard(ui, item);
  addLog(ui, `${item.name}: karta otevrena.`);
  handleTutorialEvent("fishSelected");
}

function selectRelatedFish(item) {
  currentTank = item.tank;
  updateTankTabs(ui, tanks, currentTank);
  selectFish(item);
  showFishPage("pedigree");
}

function showFishPage(page) {
  if (!selectedFish) return;
  setFishCardPage(ui, page);
  if (page === "pedigree") renderPedigreePage(ui, selectedFish, fish, selectRelatedFish, economy.pedigreeArchive);
  if (page === "atlas") {
    discoverLineageFeatures(economy, fish);
    renderAtlasPage(ui, lineageAtlasSections(economy));
  }
}

function deselectFish() {
  selectedFish = null;
  clearFishCard(ui);
}

function openJournal() {
  renderDailyGoals(ui, economy.dailyGoals);
  renderStoryChapters(ui, storyChapters(economy));
  setJournalPage(ui, "story");
  ui.appShell.classList.remove("show-card");
  ui.appShell.classList.add("show-journal");
  handleTutorialEvent("journalOpened");
}

function unlockStoryChapters() {
  const unlocked = updateStory(economy, { tanks, plants, fish });
  for (const chapter of unlocked) addJournalEntry(ui, `Nalezena nova stranka deniku: ${chapter.title}.`);
  if (unlocked.length) renderStoryChapters(ui, storyChapters(economy));
}

function performWaterChange() {
  changeWater(tanks[currentTank], waterConfig.waterChangeFraction);
  tanks[currentTank].lastTest = null;
  recordStoryAction(economy, "waterChange");
  addLiquidCloud(canvas.width * 0.5, canvas.height * 0.35, "126, 188, 207", 60);
  addJournalEntry(ui, `${tanks[currentTank].name}: vyměněna třetina vody. Nové hodnoty je potřeba změřit.`);
  completeAction("clean");
  unlockStoryChapters();
}

function closeJournal() {
  ui.appShell.classList.remove("show-journal");
  if (selectedFish) ui.appShell.classList.add("show-card");
}

function openShop() {
  refreshShop();
  ui.appShell.classList.add("show-shop");
}

function closeShop() {
  ui.appShell.classList.remove("show-shop");
}

function buySnail() {
  if (!requireShopUnlock("snail")) return;
  if (!spendForAction("snail")) return;
  tanks[currentTank].snails = (tanks[currentTank].snails ?? 0) + 1;
  refreshShop();
  addJournalEntry(ui, `Do nadrze ${tanks[currentTank].name} pribyla ampularie. Pomalu cisti rasy ze skla.`);
}

function buyFood() {
  if (!spendForAction("foodPack")) return;
  addSupply("food", supplyPackSizes.food);
  refreshShop();
  addJournalEntry(ui, "Koupena nova krabicka vlocek: 12 davek.");
}

function buyEggs() {
  if (!requireShopUnlock("eggs")) return;
  if (tanks.nursery.spawning?.eggs) {
    addJournalEntry(ui, "Ve treci nadrzi uz je jedna snuska. Nejdřív pockej, az se vylihne.");
    return;
  }
  if (!spendForAction("eggs")) return;
  addMysteryEggs(tanks.nursery);
  refreshShop();
  switchTank("nursery");
  addJournalEntry(ui, "Do treci nadrze byly vlozeny zakoupene jikry nezname linie. Vylihnou se z nich 1–2 rybky.");
}

function buyFilterUpgrade() {
  if (!requireShopUnlock("filter") || (tanks[currentTank].filterLevel ?? 1) >= 2) return;
  if (!spendForAction("filterUpgrade")) return;
  tanks[currentTank].filterLevel = 2;
  refreshShop();
  addJournalEntry(ui, `Do nadrze ${tanks[currentTank].name} byl nainstalovan Tichy filtr II.`);
}

function buyHeater() {
  if (!requireShopUnlock("heater") || tanks[currentTank].heater) return;
  if (!spendForAction("heater")) return;
  tanks[currentTank].heater = true;
  tanks[currentTank].heaterSetpoint = waterConfig.temperature.heaterSetpoint;
  refreshShop();
  addJournalEntry(ui, `Do nadrze ${tanks[currentTank].name} bylo nainstalovano topitko s termostatem.`);
}

function buyAerator() {
  if (!requireShopUnlock("aerator") || tanks[currentTank].aerator) return;
  if (!spendForAction("aerator")) return;
  tanks[currentTank].aerator = true;
  refreshShop();
  addJournalEntry(ui, `V nadrzi ${tanks[currentTank].name} bylo spusteno vzduchovani.`);
}

function requireShopUnlock(id) {
  if (isShopUnlocked(id)) return true;
  addJournalEntry(ui, `Toto zbozi se odemkne pri chovatelske zkusenosti ${shopUnlocks[id]}.`);
  return false;
}

function refreshShop() {
  document.getElementById("shopBalance").textContent = `${economy.coins} penez`;
  const skill = skillInfo();
  document.getElementById("shopSkill").textContent = `${skill.name} · zkusenost ${skill.value}${skill.nextAt ? `/${skill.nextAt}` : ""}`;
  for (const product of document.querySelectorAll("[data-shop-item]")) {
    const id = product.dataset.shopItem;
    const unlocked = isShopUnlocked(id);
    const purchased = (id === "filter" && (tanks[currentTank].filterLevel ?? 1) >= 2)
      || (id === "heater" && tanks[currentTank].heater)
      || (id === "aerator" && tanks[currentTank].aerator);
    product.disabled = !unlocked || purchased;
    product.classList.toggle("locked", !unlocked);
    const price = product.querySelector("b");
    const priceAction = { food: "foodPack", snail: "snail", eggs: "eggs", filter: "filterUpgrade", heater: "heater", aerator: "aerator" }[id];
    const configuredPrice = actionCosts[priceAction] ?? 0;
    if (price) price.textContent = purchased ? "Koupeno" : unlocked ? `${configuredPrice} penez` : `Zkus. ${shopUnlocks[id]}`;
  }
}

function handleSkillChange(change) {
  if (!change?.leveledUp) return;
  addJournalEntry(ui, `Nova uroven chovatelske dovednosti: ${change.current.name}. V obchode muze byt nove zbozi.`);
}

function moveSelectedFish() {
  if (!selectedFish) return;
  const targetTank = selectedFish.tank === "main" ? "quarantine" : "main";
  selectedFish.tank = targetTank;
  currentTank = targetTank;
  updateTankTabs(ui, tanks, currentTank);
  renderFishCard(ui, selectedFish);
  addFishHistory(ui, selectedFish, `Presunuta do nadrze: ${tanks[targetTank].name}.`);
  addLog(ui, `${selectedFish.name}: presunuta do nadrze ${tanks[targetTank].name}.`);
}

function treatSelectedFish() {
  if (!selectedFish) return;
  if (selectedFish.diseases.length === 0 && selectedFish.symptoms.length === 0) {
    addLog(ui, `${selectedFish.name}: lek ted nepotrebuje.`);
    return;
  }

  if (selectedFish.diseases.length > 0) {
    const diseaseCase = selectedFish.diseases[0];
    const disease = diseaseDatabase[diseaseCase.id];
    diseaseCase.treatmentTime = Math.max(diseaseCase.treatmentTime, selectedFish.tank === "quarantine" ? treatmentDurationDays.quarantine : treatmentDurationDays.normal);
    selectedFish.stress = Math.min(100, selectedFish.stress + 5);
    addFishHistory(ui, selectedFish, `Podan lek: ${disease.treatmentName}.`);
    addLog(ui, `${selectedFish.name}: podan ${disease.treatmentName}. V karantene zabira lepe.`);
    refreshFishCard(ui, selectedFish);
    return;
  }

  const removedSymptom = selectedFish.symptoms.shift();
  selectedFish.stress = Math.min(100, selectedFish.stress + 6);
  selectedFish.health = Math.min(100, selectedFish.health + 4);
  updateTroubleEffects(selectedFish);
  refreshFishCard(ui, selectedFish);
  addFishHistory(ui, selectedFish, `Lek zmirnil priznak: ${removedSymptom}.`);
  addLog(ui, `${selectedFish.name}: lek zmirnil ${removedSymptom}.`);
}

function breedSelectedFish() {
  if (!selectedFish) return;
  if (selectedFish.tank === "nursery") {
    addJournalEntry(ui, `${selectedFish.name}: uz je ve treci nadrzi.`);
    return;
  }
  selectedFish.previousTank = selectedFish.tank;
  selectedFish.tank = "nursery";
  const mate = fish.find((item) => item.id !== selectedFish.id && item.tank === "nursery" && item.sex !== selectedFish.sex);
  addFishHistory(ui, selectedFish, "Presunuta do treci nadrze.");
  if (mate) {
    const assessment = pairingAssessment(selectedFish, mate, economy.pedigreeArchive);
    const ancestors = assessment.sharedAncestors.length ? ` Spolecni predci: ${assessment.sharedAncestors.join(", ")}.` : "";
    addJournalEntry(ui, `${selectedFish.name} + ${mate.name}: pribuznost ${(assessment.coefficient * 100).toFixed(1)} %, geneticke riziko ${assessment.level}.${ancestors}`);
  } else {
    addJournalEntry(ui, `${selectedFish.name}: presunuta do treci nadrze. Pridej zdraveho dospeleho partnera opacneho pohlavi.`);
  }
  currentTank = "nursery";
  updateTankTabs(ui, tanks, currentTank);
  renderFishCard(ui, selectedFish);
}

function sellSelectedFish() {
  if (!selectedFish || !prepareForSale(selectedFish)) return;
  addJournalEntry(ui, `${selectedFish.name}: pripravena na prodej za ${selectedFish.salePrice} penez.`);
  currentTank = "sale";
  updateTankTabs(ui, tanks, currentTank);
  renderFishCard(ui, selectedFish);
}

function startSalesDay() {
  if (!fish.some((item) => item.tank === "sale")) {
    addJournalEntry(ui, "Prodejni nadrz je prazdna.");
    return;
  }
  startLiveSales(tanks.sale);
  currentTank = "sale";
  updateTankTabs(ui, tanks, currentTank);
  addJournalEntry(ui, "Prodejni den zacal. Zakaznici prichazeji k nadrzi.");
}

canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  if (heldItem) {
    if (heldItem !== "clean" && heldItem !== "scrape" && isPointInTank(x, y)) {
      useHeldItem(x, y);
    }
    return;
  }

  for (const item of [...getVisibleFish()].reverse()) {
    const rx = 48 * item.size * (item.growthScale ?? 1) * fishRenderScale;
    const ry = 24 * item.size * (item.growthScale ?? 1) * fishRenderScale;
    if (Math.abs(x - item.x) <= rx && Math.abs(y - item.y) <= ry) {
      selectFish(item);
      return;
    }
  }

  deselectFish();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setHeldItem(null);
    deselectFish();
    closeJournal();
    closeShop();
  }
});

  for (const button of document.querySelectorAll("[data-action]")) {
  button.addEventListener("click", () => {
    if (button.dataset.action === heldItem) {
      setHeldItem(null);
      return;
    }
    if (button.dataset.action === "journal") {
      openJournal();
    } else if (button.dataset.action === "shop") {
      openShop();
    } else if (button.dataset.action === "debug-money" && debugMode) {
      economy.coins += 100;
      addJournalEntry(ui, "Debug: pridano 100 penez.");
    } else if (button.dataset.action === "sales") {
      startSalesDay();
    } else if (button.dataset.action === "clean" || button.dataset.action === "scrape") {
      setHeldItem(button.dataset.action);
    } else if (button.dataset.action === "water-change") {
      performWaterChange();
    } else if (button.dataset.action === "restart-game") {
      restartGame();
    } else {
      setHeldItem(button.dataset.action);
    }
  });
}

document.getElementById("journalCloseButton").addEventListener("click", closeJournal);
document.getElementById("shopCloseButton").addEventListener("click", closeShop);
document.getElementById("buyFoodButton").addEventListener("click", buyFood);
document.getElementById("buySnailButton").addEventListener("click", buySnail);
document.getElementById("buyEggsButton").addEventListener("click", buyEggs);
document.getElementById("buyFilterButton").addEventListener("click", buyFilterUpgrade);
document.getElementById("buyHeaterButton").addEventListener("click", buyHeater);
document.getElementById("buyAeratorButton").addEventListener("click", buyAerator);
document.getElementById("fishCardCloseButton").addEventListener("click", deselectFish);
for (const tab of ui.fishPageTabs) tab.addEventListener("click", () => showFishPage(tab.dataset.fishPage));
for (const tab of ui.journalPageTabs) tab.addEventListener("click", () => setJournalPage(ui, tab.dataset.journalPage));

ui.moveFishButton.addEventListener("click", moveSelectedFish);
ui.treatFishButton.addEventListener("click", treatSelectedFish);
ui.breedFishButton.addEventListener("click", breedSelectedFish);
ui.sellFishButton.addEventListener("click", sellSelectedFish);

for (const tab of ui.tankTabs) {
  tab.addEventListener("click", () => switchTank(tab.dataset.tank));
}

for (const button of document.querySelectorAll("[data-window-action]")) {
  button.addEventListener("click", () => {
    if (!window.desktopWindow) return;
    const action = button.dataset.windowAction;
    if (action === "minimize") window.desktopWindow.minimize();
    if (action === "pin") window.desktopWindow.toggleAlwaysOnTop();
    if (action === "close") window.desktopWindow.close();
    if (action === "restart") restartGame();
  });
}

function restartGame() {
  const confirmed = window.confirm("Opravdu zacit novou hru? Ulozene ryby, penize a postup budou smazany.");
  if (!confirmed) return;
  resettingGame = true;
  clearSavedGame();
  location.reload();
}

const dragHandle = document.querySelector(".drag-handle");
if (dragHandle && window.desktopWindow) {
  let dragging = false;
  let lastScreenX = 0;
  let lastScreenY = 0;

  dragHandle.addEventListener("mousedown", (e) => {
    dragging = true;
    lastScreenX = e.screenX;
    lastScreenY = e.screenY;
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    window.desktopWindow.move(e.screenX - lastScreenX, e.screenY - lastScreenY);
    lastScreenX = e.screenX;
    lastScreenY = e.screenY;
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
  });
}

function setHeldItem(action) {
  if (action && !canAfford(action)) {
    addJournalEntry(ui, t("event.no_money", { day: gameClock.day, cost: actionCosts[action] ?? 0 }));
    return;
  }
  heldItem = action;
  canvas.classList.toggle("maintenance-cursor", heldItem === "clean" || heldItem === "scrape");
  if (heldItem !== "clean" && heldItem !== "scrape") {
    toolOverGlass = false;
    canvas.classList.remove("tool-over-glass");
  }
  for (const button of document.querySelectorAll("[data-action]")) {
    button.classList.toggle("selected", button.dataset.action === heldItem);
  }
  if (heldItem === "feed") addLog(ui, "V ruce: vlocky. Klikni do vody.");
  if (heldItem === "test") addLog(ui, "V ruce: test ph. Klikni do vody.");
  if (heldItem === "plant") addLog(ui, "V ruce: rostlina. Klikni na misto v nadrzi.");
  if (heldItem === "medicine") addLog(ui, "V ruce: lek. Klikni do vody nebo pouzij kartu ryby.");
  if (heldItem === "clean") addJournalEntry(ui, "Odkalovac: drz tlacitko mysi a pomalu prejizdej po dne.");
  if (heldItem === "scrape") addJournalEntry(ui, "Skrabka: drz tlacitko mysi a prejizdej po skle s rasou.");
  updateHeldCursor();
  if (heldItem === "clean") {
    siphonLoad = 0;
    ui.heldCursor.style.setProperty("--siphon-turbidity", "0");
    ui.heldCursor.style.setProperty("--siphon-fill", "0px");
  }
}

function useHeldItem(x, y) {
  if (heldItem === "feed") {
    if (!consumeSupply("food")) {
      addJournalEntry(ui, "Vlocky dosly. Novou krabicku koupis v obchode.");
      openShop();
      setHeldItem(null);
      return;
    }
    addFoodAt(x, y);
    addLog(ui, "Vlocky padaji do vody.");
    if (currentTank === "main") exposeTankToTrouble("food", fish, currentTank, (text) => addLog(ui, text));
    completeAction("feed");
  }

  if (heldItem === "test") {
    if (!spendForAction("test")) return;
    addLiquidCloud(x, y, "148, 103, 184", 18);
    const result = waterTestResult(tanks[currentTank]);
    tanks[currentTank].lastTest = result;
    recordStoryAction(economy, "test");
    addJournalEntry(ui, `Den ${gameClock.day}: ${tanks[currentTank].name}. ${formatWaterTest(result)}. Voda ${result.quality.toLowerCase()}. Doporuceni: ${waterTestAdvice(result)}`);
    completeAction("test");
    unlockStoryChapters();
  }

  if (heldItem === "plant") {
    if (!spendForAction("plant")) return;
    const type = plantTypeOrder[plants[currentTank].length % plantTypeOrder.length];
    const plant = createPlant(type, x, 70 + Math.random() * 70, Math.random() * Math.PI * 2);
    plants[currentTank].push(plant);
    tanks[currentTank].waterQuality = Math.min(1, tanks[currentTank].waterQuality + plantTypes[type].waterBonus);
    nextPlantX = x + 58;
    addLog(ui, `Do akvaria pribyla ${plantTypes[type].name}.`);
    const troubleSource = tanks[currentTank].plantTrouble;
    if (troubleSource) exposeTankToTrouble(troubleSource, fish, currentTank, (text) => addLog(ui, text));
    completeAction("plant");
  }

  if (heldItem === "medicine") {
    if (!spendForAction("medicine")) return;
    addLiquidCloud(x, y, "184, 95, 112", 22);
    treatFishNearestTo(x, y);
  }

  setHeldItem(null);
}

function spendForAction(action) {
  if (payForAction(action)) return true;
  addJournalEntry(ui, t("event.no_money", { day: gameClock.day }));
  setHeldItem(null);
  return false;
}

function completeAction(action) {
  recordAction(action, (task, skillChange) => {
    addJournalEntry(ui, `${t("event.task_complete", { task: task.label, reward: task.reward ?? 0 })} +${task.skillXp ?? task.reputation ?? 0} zkusenosti.`);
    handleSkillChange(skillChange);
    renderDailyGoals(ui, economy.dailyGoals);
  });
  handleTutorialEvent("action", action);
}

function restoreSavedGame() {
  const saved = loadGame();
  if (!saved) return;
  restoreArray(fish, saved.fish);
  if ((saved.version ?? 1) < 2) {
    const starterMale = fish.find((item) => item.id === "f2");
    if (starterMale) starterMale.ageDays = Math.max(32, starterMale.ageDays ?? 0);
  }
  if ((saved.version ?? 1) < 3) {
    saved.tanks ??= {};
    saved.tanks.main ??= {};
    saved.tanks.main.waste = Math.max(0.34, saved.tanks.main.waste ?? 0);
    saved.tanks.main.debris = Math.max(0.42, saved.tanks.main.debris ?? 0);
    saved.tanks.main.brownWater = Math.max(0.3, saved.tanks.main.brownWater ?? 0);
    saved.tanks.main.algae = Math.max(0.48, saved.tanks.main.algae ?? 0);
  }
  if ((saved.version ?? 1) < 4) {
    saved.tanks ??= {};
    saved.tanks.main ??= {};
    saved.tanks.main.debris = Math.max(0.48, saved.tanks.main.debris ?? 0);
    saved.tanks.main.brownWater = Math.max(0.34, saved.tanks.main.brownWater ?? 0);
    saved.tanks.main.algae = Math.max(0.56, saved.tanks.main.algae ?? 0);
  }
  restoreArray(plants.main, saved.plants?.main);
  restoreArray(plants.quarantine, saved.plants?.quarantine);
  restoreArray(plants.nursery, saved.plants?.nursery);
  restoreArray(plants.sale, saved.plants?.sale);
  restoreObject(tanks.main, saved.tanks?.main);
  restoreObject(tanks.quarantine, saved.tanks?.quarantine);
  restoreObject(tanks.nursery, saved.tanks?.nursery);
  restoreObject(tanks.sale, saved.tanks?.sale);
  restoreObject(economy, saved.economy);
  if (saved.economy?.skillXp == null && saved.economy?.reputation != null) economy.skillXp = saved.economy.reputation;
  if ((saved.economy?.filterLevel ?? 1) >= 2 && !saved.tanks?.main?.filterLevel) tanks.main.filterLevel = 2;
  if (saved.gameClock) {
    gameClock.day = saved.gameClock.day ?? gameClock.day;
    gameClock.minute = saved.gameClock.minute ?? gameClock.minute;
  }
}

function persistGame() {
  if (resettingGame) return;
  saveGame({ fish, plants, tanks, economy, gameClock });
}

setInterval(persistGame, 10000);
window.addEventListener("beforeunload", persistGame);

function isPointInTank(x, y) {
  const view = getView();
  const glass = getGlassBounds(view);
  return x >= glass.left && x <= glass.right && y >= 42 && y <= view.height - 32;
}

canvas.addEventListener("pointerdown", (event) => {
  if (heldItem !== "clean" && heldItem !== "scrape") return;
  if (!spendForAction(heldItem)) return;
  maintenanceDragging = true;
  ui.heldCursor.classList.add("working");
  canvas.setPointerCapture(event.pointerId);
  applyMaintenance(event);
});

canvas.addEventListener("contextmenu", (event) => {
  if (!heldItem) return;
  event.preventDefault();
  maintenanceDragging = false;
  setHeldItem(null);
});

canvas.addEventListener("pointermove", (event) => {
  if (maintenanceDragging) applyMaintenance(event);
});

canvas.addEventListener("pointerup", (event) => {
  if (!maintenanceDragging) return;
  maintenanceDragging = false;
  ui.heldCursor.classList.remove("working");
  canvas.releasePointerCapture(event.pointerId);
  if (heldItem === "clean") {
    ui.heldCursor.style.setProperty("--siphon-turbidity", "0");
    ui.heldCursor.style.setProperty("--siphon-fill", "0px");
    siphonLoad = 0;
    completeAction("clean");
  }
});

function applyMaintenance(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  if (!isPointInTank(x, y)) return;
  if (heldItem === "clean" && y > rect.height - 190) {
    const before = tanks[currentTank].debris ?? 0;
    vacuumTank(tanks[currentTank], x / rect.width, 0.055, 0.055);
    const removed = Math.max(0, before - (tanks[currentTank].debris ?? 0));
    siphonLoad = Math.min(0.92, siphonLoad + removed * 9 + 0.018);
    ui.heldCursor.style.setProperty("--siphon-turbidity", siphonLoad.toFixed(2));
    ui.heldCursor.style.setProperty("--siphon-fill", `${Math.round(siphonLoad * 47)}px`);
    if (performance.now() - lastSiphonCloudAt > 85) {
      addSiphonSediment(x, y - 3);
      lastSiphonCloudAt = performance.now();
    }
  }
  if (heldItem === "scrape") {
    const waterTop = getSurfaceY(getView());
    const usableHeight = Math.max(1, rect.height - waterTop - 25);
    scrapeAlgae(tanks[currentTank], x / rect.width, (y - waterTop) / usableHeight, 0.075, 0.06);
  }
}

function addSiphonSediment(x, y) {
  for (let i = 0; i < 3; i += 1) {
    liquidClouds.push({
      x: x + (i - 1) * 7,
      y: y - (i % 2) * 4,
      vx: (i - 1) * 7,
      vy: -3 - i,
      radius: 5 + i * 2,
      color: "112, 76, 43",
      life: 0.7,
      maxLife: 0.7,
      sediment: true,
      tank: currentTank,
    });
  }
}

function addFoodAt(x, y) {
  for (let i = 0; i < 24; i += 1) {
    foodParticles.push({
      x: x + Math.sin(i * 1.7) * 28,
      y: y + Math.cos(i * 2.1) * 8,
      vx: Math.sin(i * 3.4) * 5,
      vy: 8 + (i % 5) * 3,
      life: 10,
      tank: currentTank,
    });
  }
}

function addLiquidCloud(x, y, color, radius) {
  for (let i = 0; i < 7; i += 1) {
    liquidClouds.push({
      x: x + Math.sin(i * 2.2) * 10,
      y: y + Math.cos(i * 1.8) * 8,
      vx: Math.sin(i) * 8,
      vy: Math.cos(i * 1.4) * 4,
      radius: radius + i * 3,
      color,
      life: 7,
      maxLife: 7,
      tank: currentTank,
    });
  }
}

function updateFoodParticles(delta, view) {
  for (const particle of [...foodParticles]) {
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.life -= delta;
    particle.vy = Math.min(24, particle.vy + delta * 5);
    if (particle.y > view.height - 30) particle.vy *= -0.15;
    if (particle.life <= 0) foodParticles.splice(foodParticles.indexOf(particle), 1);
  }
}

function updateLiquidClouds(delta) {
  for (const cloud of [...liquidClouds]) {
    cloud.x += cloud.vx * delta;
    cloud.y += cloud.vy * delta;
    cloud.radius += delta * 18;
    cloud.life -= delta;
    cloud.vx *= 0.985;
    cloud.vy *= 0.985;
    if (cloud.life <= 0) liquidClouds.splice(liquidClouds.indexOf(cloud), 1);
  }
}

function getNearestFood(item) {
  let nearest = null;
  let nearestDistance = Infinity;
  for (const particle of foodParticles) {
    if (particle.tank !== item.tank) continue;
    const distance = Math.hypot(particle.x - item.x, particle.y - item.y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = particle;
    }
  }
  return { particle: nearest, distance: nearestDistance };
}

function attractFishToFood(item, delta) {
  const { particle, distance } = getNearestFood(item);
  if (!particle || distance > 260) return;
  const dx = particle.x - item.x;
  if (Math.abs(dx) > 4) item.dir = dx > 0 ? 1 : -1;
  item.x += (particle.x - item.x) * delta * 0.38;
  item.y += (particle.y - item.y) * delta * 0.34;
}

function feedFishNearFood(item, appetite, delta) {
  const { particle, distance } = getNearestFood(item);
  if (!particle || distance > 28) return;
  item.hunger = Math.max(0, item.hunger - delta * hungerConfig.feedingPowerPerSecond * appetite);
  particle.life -= delta * 7;
}

function treatFishNearestTo(x, y) {
  const candidates = getVisibleFish()
    .map((item) => ({ item, distance: Math.hypot(item.x - x, item.y - y) }))
    .sort((a, b) => a.distance - b.distance);
  if (candidates.length === 0 || candidates[0].distance > 96) {
    addLog(ui, "Lek se rozptylil ve vode.");
    return;
  }
  selectedFish = candidates[0].item;
  renderFishCard(ui, selectedFish);
  treatSelectedFish();
}

function loop(now) {
  const delta = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  update(delta);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("pointermove", (event) => {
  const dx = event.clientX - pointer.x;
  const dy = event.clientY - pointer.y;
  if ((heldItem === "clean" || heldItem === "scrape") && Math.hypot(dx, dy) > 2) {
    toolTargetAngle = Math.atan2(dy, dx) + (heldItem === "scrape" ? -Math.PI / 2 : Math.PI / 2);
    const turn = Math.atan2(Math.sin(toolTargetAngle - toolAngle), Math.cos(toolTargetAngle - toolAngle));
    toolAngle += turn * 0.16;
  }
  pointer = { x: event.clientX, y: event.clientY };
  if (heldItem === "clean" || heldItem === "scrape") {
    const rect = canvas.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    toolOverGlass = event.target === canvas && isPointInTank(localX, localY);
    canvas.classList.toggle("tool-over-glass", toolOverGlass);
  }
  updateHeldCursor();
});
resizeCanvas();
updateTankTabs(ui, tanks, currentTank);
clearFishCard(ui);
requestAnimationFrame(loop);

function updateHeldCursor() {
  ui.heldCursor.className = "held-cursor";
  if (!heldItem) {
    ui.heldCursor.style.transform = "translate(-100px, -100px)";
    return;
  }
  if ((heldItem === "clean" || heldItem === "scrape") && !toolOverGlass) {
    ui.heldCursor.style.transform = "translate(-200px, -200px)";
    return;
  }
  ui.heldCursor.classList.add("visible", heldItem);
  if (maintenanceDragging) ui.heldCursor.classList.add("working");
  const maintenanceTool = heldItem === "clean" || heldItem === "scrape";
  const x = pointer.x + (maintenanceTool ? 0 : 14);
  const y = pointer.y + (maintenanceTool ? 0 : 14);
  const rotation = maintenanceTool ? ` rotate(${toolAngle}rad)` : "";
  ui.heldCursor.style.transform = `translate(${x}px, ${y}px)${rotation}`;
}
