import { drawAquarium, drawFoodParticles, drawGlass, drawGlassAlgae, drawLiquidClouds, drawSaleEffects } from "./art/aquariumArt.js";
import { getGlassBounds, getSurfaceY } from "./art/aquariumArt.js";
import { drawFish } from "./art/fishArt.js";
import { fishRenderScale } from "./art/fishArt.js";
import { loadFishSpriteAssets } from "./art/spriteAssets.js";
import { fish, palette, plants, tanks } from "./data/fishData.js";
import { applySpeciesMetadata } from "./data/speciesData.js";
import { createPlant, plantTypes, plantTypeOrder } from "./data/plantData.js";
import { diseaseDatabase } from "./data/healthData.js";
import { initializeLifecycle, updateLifecycle } from "./systems/lifecycleSystem.js";
import { applyTankEffects, describeWater, formatGameTime, gameClock, scrapeAlgae, updateWorld, vacuumTank } from "./systems/tankSystem.js";
import { actionCosts, addSupply, canAfford, consumeSupply, economy, initializeEconomy, payForAction, recordAction, supplyCount, taskText } from "./systems/economySystem.js";
import { clearSavedGame, loadGame, restoreArray, restoreObject, saveGame } from "./systems/saveSystem.js";
import { t } from "./i18n/index.js";
import { addMysteryEggs, initializeBreeding, updateSpawning } from "./systems/breedingSystem.js";
import { prepareForSale, startLiveSales, updateLiveSales } from "./systems/salesSystem.js";
import { contractText, ensureContract, recordContractSale } from "./systems/contractSystem.js";
import { eldritchJournalEntry } from "./systems/eldritchSystem.js";
import {
  exposeTankToTrouble,
  getActiveSymptoms,
  getAppetiteFactor,
  hasBreedingBlock,
  spreadContagiousDiseases,
  updateDiseases,
  updateTroubleEffects,
} from "./systems/healthSystem.js";
import { addFishHistory, addJournalEntry, addLog, clearFishCard, createUi, refreshFishCard, renderFishCard, updateTankTabs } from "./ui.js";

const canvas = document.getElementById("aquarium");
const ctx = canvas.getContext("2d");
const ui = createUi();
loadFishSpriteAssets();
restoreSavedGame();
initializeEconomy();
applySpeciesMetadata(fish);
ensureContract(economy);
for (const item of fish) initializeLifecycle(item);
initializeBreeding(fish);
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
const foodParticles = [];
const liquidClouds = [];
const debugMode = new URLSearchParams(location.search).has("debugTime");
document.body.classList.toggle("debug-mode", debugMode);

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
  const view = getView();
  updateFoodParticles(delta, view);
  updateLiquidClouds(delta);
  updateWorld(delta, tanks, plants, fish, (day) => {
    addJournalEntry(ui, t("event.day_started", { day }));
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
      const names = babies.map((baby) => baby.name).join(" a ");
      const message = parents.length === 2
        ? `Z jiker ryb ${parents[0].name} a ${parents[1].name} se vylihl poter: ${names}.`
        : `Ze zakoupenych jiker se vylihl poter: ${names}.`;
      addJournalEntry(ui, message);
      const anomalyEntry = eldritchJournalEntry(babies);
      if (anomalyEntry) addJournalEntry(ui, anomalyEntry);
    },
    { minute: gameClock.minute, waterQuality: tanks.nursery.waterQuality, debug: debugMode }
  );
  updateLiveSales(delta, tanks.sale, fish, economy, (item, price) => {
    addJournalEntry(ui, `Zakaznik koupil rybu ${item.name} za ${price} penez.`);
    completeAction("sell");
    const contractReward = recordContractSale(item, economy);
    if (contractReward) addJournalEntry(ui, `Zakazka splnena. Bonus ${contractReward} penez a nova zakazka je pripravena.`);
    if (selectedFish?.id === item.id) { selectedFish = null; clearFishCard(ui); }
  });

  for (const item of fish) {
    item.phase += delta * 3;
    updateLifecycle(item, delta, (text) => addJournalEntry(ui, `Den ${Math.floor(item.ageDays)}: ${text}`));
    const appetite = getAppetiteFactor(item);
    const hungerRate = item.traits.includes("ciziMetabolismus") ? 0.5 : 0.85;
    item.hunger = Math.min(100, item.hunger + delta * hungerRate);
    applyTankEffects(item, delta, tanks[item.tank]);
    updateDiseases(item, delta, tanks, (text) => addLog(ui, text));
    updateTroubleEffects(item);
    item.canBreed = item.canBreedByAge && !hasBreedingBlock(item);

    feedFishNearFood(item, appetite, delta);
  }

  spreadContagiousDiseases(delta, fish, (text) => addLog(ui, text));

  for (const item of getVisibleFish()) {
    const bob = Math.sin(item.phase) * 9;
    const hungerBoost = item.hunger > 68 ? 1.18 : 1;
    item.x += item.dir * item.speed * (item.stageSpeed ?? 1) * hungerBoost * delta;
    item.y += Math.sin(item.phase * 0.7) * delta * 12;

    attractFishToFood(item, delta);

    const margin = 74 * item.size * (item.growthScale ?? 1) * fishRenderScale;
    const glass = getGlassBounds(view);
    if (item.x > glass.right - margin) {
      item.x = glass.right - margin;
      item.dir = -1;
    }
    if (item.x < glass.left + margin) {
      item.x = glass.left + margin;
      item.dir = 1;
    }

    item.y = Math.max(getSurfaceY(view) + 18, Math.min(view.height - 82, item.y + bob * delta));
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
  ctx.restore();

  drawGlass(ctx, view);
  refreshFishCard(ui, selectedFish);
  ui.gameDay.textContent = t("ui.day", { day: gameClock.day });
  ui.gameTime.textContent = formatGameTime();
  ui.waterQuality.textContent = t("ui.water", { quality: describeWater(tanks[currentTank]).toLowerCase() });
  ui.coinCount.textContent = t("ui.coins", { coins: economy.coins });
  document.getElementById("foodDoseCount").textContent = `${supplyCount("food")} davek`;
  ui.currentTask.textContent = taskText();
  ui.customerContract.textContent = contractText(ensureContract(economy));
}

function selectFish(item) {
  selectedFish = item;
  renderFishCard(ui, item);
  addLog(ui, `${item.name}: karta otevrena.`);
}

function deselectFish() {
  selectedFish = null;
  clearFishCard(ui);
}

function openJournal() {
  ui.appShell.classList.add("show-journal");
}

function closeJournal() {
  ui.appShell.classList.remove("show-journal");
}

function openShop() {
  document.getElementById("shopBalance").textContent = `${economy.coins} penez`;
  ui.appShell.classList.add("show-shop");
}

function closeShop() {
  ui.appShell.classList.remove("show-shop");
}

function buySnail() {
  if (!spendForAction("snail")) return;
  tanks[currentTank].snails = (tanks[currentTank].snails ?? 0) + 1;
  document.getElementById("shopBalance").textContent = `${economy.coins} penez`;
  addJournalEntry(ui, `Do nadrze ${tanks[currentTank].name} pribyla ampularie. Pomalu cisti rasy ze skla.`);
}

function buyFood() {
  if (!spendForAction("foodPack")) return;
  addSupply("food", 12);
  document.getElementById("shopBalance").textContent = `${economy.coins} penez`;
  addJournalEntry(ui, "Koupena nova krabicka vlocek: 12 davek.");
}

function buyEggs() {
  if (tanks.nursery.spawning?.eggs) {
    addJournalEntry(ui, "Ve treci nadrzi uz je jedna snuska. Nejdřív pockej, az se vylihne.");
    return;
  }
  if (!spendForAction("eggs")) return;
  addMysteryEggs(tanks.nursery);
  document.getElementById("shopBalance").textContent = `${economy.coins} penez`;
  switchTank("nursery");
  addJournalEntry(ui, "Do treci nadrze byly vlozeny zakoupene jikry nezname linie. Vylihnou se z nich 1–2 rybky.");
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
    diseaseCase.treatmentTime = Math.max(diseaseCase.treatmentTime, selectedFish.tank === "quarantine" ? 9 : 4);
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
  addFishHistory(ui, selectedFish, "Presunuta do treci nadrze.");
  addJournalEntry(ui, `${selectedFish.name}: presunuta do treci nadrze. Pridej zdraveho dospeleho partnera opacneho pohlavi.`);
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
document.getElementById("fishCardCloseButton").addEventListener("click", deselectFish);

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
    addJournalEntry(ui, t("event.water_test", { day: gameClock.day, tank: tanks[currentTank].name, quality: describeWater(tanks[currentTank]).toLowerCase(), waste: Math.round((tanks[currentTank].waste ?? 0) * 100) }));
    completeAction("test");
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
  recordAction(action, (task) => addJournalEntry(ui, t("event.task_complete", { task: task.label, reward: task.reward ?? 0 })));
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
  }
  if (heldItem === "scrape") {
    const waterTop = getSurfaceY(getView());
    const usableHeight = Math.max(1, rect.height - waterTop - 25);
    scrapeAlgae(tanks[currentTank], x / rect.width, (y - waterTop) / usableHeight, 0.075, 0.06);
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
  item.hunger = Math.max(0, item.hunger - delta * 42 * appetite);
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
