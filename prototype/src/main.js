import { drawAquarium, drawFoodParticles, drawGlass, drawLiquidClouds } from "./art/aquariumArt.js";
import { getGlassBounds, getSurfaceY } from "./art/aquariumArt.js";
import { drawFish } from "./art/fishArt.js";
import { fishRenderScale } from "./art/fishArt.js";
import { loadFishSpriteAssets } from "./art/spriteAssets.js";
import { fish, palette, plants, tanks } from "./data/fishData.js";
import { createPlant, plantTypes, plantTypeOrder } from "./data/plantData.js";
import { diseaseDatabase } from "./data/healthData.js";
import { initializeLifecycle, updateLifecycle } from "./systems/lifecycleSystem.js";
import { applyTankEffects, cleanTank, describeWater, formatGameTime, gameClock, updateWorld } from "./systems/tankSystem.js";
import { actionCosts, canAfford, economy, initializeEconomy, payForAction, recordAction, taskText } from "./systems/economySystem.js";
import { loadGame, restoreArray, restoreObject, saveGame } from "./systems/saveSystem.js";
import { t } from "./i18n/index.js";
import { breedPair, findMate, initializeBreeding } from "./systems/breedingSystem.js";
import { prepareForSale, runSalesDay } from "./systems/salesSystem.js";
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
initializeEconomy();
restoreSavedGame();
for (const item of fish) initializeLifecycle(item);
initializeBreeding(fish);

let selectedFish = null;
let lastTime = performance.now();
let currentTank = "main";
let nextPlantX = 220;
let heldItem = null;
let pointer = { x: -100, y: -100 };
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

  for (const item of fish) {
    item.phase += delta * 3;
    updateLifecycle(item, delta, (text) => addJournalEntry(ui, `Den ${Math.floor(item.ageDays)}: ${text}`));
    const appetite = getAppetiteFactor(item);
    item.hunger = Math.min(100, item.hunger + delta * 0.85);
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
  drawAquarium(ctx, view, plants[currentTank], currentTank);

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
  ctx.restore();

  drawGlass(ctx, view);
  refreshFishCard(ui, selectedFish);
  ui.gameDay.textContent = t("ui.day", { day: gameClock.day });
  ui.gameTime.textContent = formatGameTime();
  ui.waterQuality.textContent = t("ui.water", { quality: describeWater(tanks[currentTank]).toLowerCase() });
  ui.coinCount.textContent = t("ui.coins", { coins: economy.coins });
  ui.currentTask.textContent = taskText();
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
  const mate = findMate(selectedFish, fish);
  if (!mate) {
    addJournalEntry(ui, `${selectedFish.name}: chybi zdravy dospely partner opacneho pohlavi ve stejne nadrzi.`);
    return;
  }
  const babies = breedPair(selectedFish, mate, fish);
  babies.forEach(initializeLifecycle);
  addFishHistory(ui, selectedFish, `Potomci s rybou ${mate.name}: ${babies.map((baby) => baby.name).join(", ")}.`);
  addJournalEntry(ui, `V odchovne se narodil poter: ${babies.map((baby) => baby.name).join(" a ")}.`);
  currentTank = "nursery";
  updateTankTabs(ui, tanks, currentTank);
  selectedFish = babies[0];
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
  const result = runSalesDay(fish);
  if (!result.sold.length && !result.unsold.length) {
    addJournalEntry(ui, "Prodejni nadrz je prazdna.");
    return;
  }
  economy.coins += result.income;
  const soldNames = result.sold.map(({ item }) => item.name).join(", ") || "zadne";
  addJournalEntry(ui, `Prodejni den: prodano ${soldNames}. Prijem ${result.income} penez. Neprodano ${result.unsold.length}.`);
  selectedFish = null;
  clearFishCard(ui);
}

canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  if (heldItem) {
    if (isPointInTank(x, y)) {
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
  }
});

  for (const button of document.querySelectorAll("[data-action]")) {
  button.addEventListener("click", () => {
    if (button.dataset.action === "journal") {
      openJournal();
    } else if (button.dataset.action === "debug-money" && debugMode) {
      economy.coins += 100;
      addJournalEntry(ui, "Debug: pridano 100 penez.");
    } else if (button.dataset.action === "sales") {
      startSalesDay();
    } else if (button.dataset.action === "clean") {
      if (!spendForAction("clean")) return;
      cleanTank(tanks[currentTank]);
      addLiquidCloud(getView().width / 2, getView().height - 80, "110, 194, 205", 34);
      addJournalEntry(ui, t("event.tank_cleaned", { day: gameClock.day, tank: tanks[currentTank].name }));
      completeAction("clean");
    } else {
      setHeldItem(button.dataset.action);
    }
  });
}

document.getElementById("journalCloseButton").addEventListener("click", closeJournal);
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
  });
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
  for (const button of document.querySelectorAll("[data-action]")) {
    button.classList.toggle("selected", button.dataset.action === heldItem);
  }
  if (heldItem === "feed") addLog(ui, "V ruce: vlocky. Klikni do vody.");
  if (heldItem === "test") addLog(ui, "V ruce: test ph. Klikni do vody.");
  if (heldItem === "plant") addLog(ui, "V ruce: rostlina. Klikni na misto v nadrzi.");
  if (heldItem === "medicine") addLog(ui, "V ruce: lek. Klikni do vody nebo pouzij kartu ryby.");
  updateHeldCursor();
}

function useHeldItem(x, y) {
  if (heldItem === "feed") {
    if (!spendForAction("feed")) return;
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
  recordAction(action, (task) => addJournalEntry(ui, t("event.tutorial_complete", { task: task.label })));
}

function restoreSavedGame() {
  const saved = loadGame();
  if (!saved) return;
  restoreArray(fish, saved.fish);
  if ((saved.version ?? 1) < 2) {
    const starterMale = fish.find((item) => item.id === "f2");
    if (starterMale) starterMale.ageDays = Math.max(32, starterMale.ageDays ?? 0);
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
  saveGame({ fish, plants, tanks, economy, gameClock });
}

setInterval(persistGame, 10000);
window.addEventListener("beforeunload", persistGame);

function isPointInTank(x, y) {
  const view = getView();
  const glass = getGlassBounds(view);
  return x >= glass.left && x <= glass.right && y >= 42 && y <= view.height - 32;
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
  pointer = { x: event.clientX, y: event.clientY };
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
  ui.heldCursor.classList.add("visible", heldItem);
  ui.heldCursor.style.transform = `translate(${pointer.x + 14}px, ${pointer.y + 14}px)`;
}
