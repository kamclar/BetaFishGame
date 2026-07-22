import { customerCount } from "../data/customerData.js";
import { salesConfig } from "../config/salesConfig.js";
import { colorLineForFish, colorLineValueMultiplier } from "../config/colorLineConfig.js";

export function fishValue(item) {
  const base = salesConfig.rarityValue[item.rarity] ?? salesConfig.rarityValue.Common;
  const healthFactor = salesConfig.healthValueMin + (item.visibleHealth ?? item.health) / 100 * salesConfig.healthValueRange;
  const ageFactor = salesConfig.ageValue[item.lifeStage] ?? salesConfig.ageValue.other;
  const ordinaryValue = base * healthFactor * ageFactor + item.traits.length * salesConfig.traitValue
    + (item.parents?.length ? salesConfig.pedigreeValue : 0);
  return Math.max(salesConfig.minimumPrice, Math.round(ordinaryValue * colorLineValueMultiplier(item)));
}

export function prepareForSale(item) {
  if (item.lifeStage === "fry" || item.diseases.length || item.tank === "sale") return false;
  item.previousTank = item.tank;
  item.tank = "sale";
  item.salePrice = fishValue(item);
  item.history.unshift(`Pripravena na prodej za ${item.salePrice} penez.`);
  return true;
}

export function runSalesDay(fish) {
  const offered = fish.filter((item) => item.tank === "sale");
  const sold = [], unsold = [];
  for (const item of offered) {
    const appeal = 0.4 + Math.min(0.42, item.traits.length * 0.08
      + (item.rarity !== "Common" ? 0.14 : 0) + (colorLineForFish(item) ? 0.12 : 0));
    if (Math.random() < Math.min(appeal, purchaseChance(item))) sold.push({ item, price: item.salePrice ?? fishValue(item) });
    else { item.stress = Math.min(100, item.stress + 8); unsold.push(item); }
  }
  sold.forEach(({ item }) => fish.splice(fish.indexOf(item), 1));
  return { sold, unsold, income: sold.reduce((sum, result) => sum + result.price, 0) };
}

const debug = new URLSearchParams(location.search).has("debugTime");

export function startLiveSales(tank) {
  tank.sales = { active: true, spawnTimer: 0, visitors: [], effects: [], nextId: 1 };
}

function chooseCustomerType(visitors) {
  const activeTypes = new Set(visitors.map((visitor) => visitor.type));
  const availableTypes = Array.from({ length: customerCount }, (_, type) => type)
    .filter((type) => !activeTypes.has(type));
  return availableTypes[Math.floor(Math.random() * availableTypes.length)] ?? 0;
}

export function updateLiveSales(delta, tank, fish, economy, onSale) {
  const sales = tank.sales;
  if (!sales?.active) return;
  sales.effects ??= [];
  for (const effect of [...sales.effects]) {
    effect.timer -= delta;
    if (effect.timer <= 0) sales.effects.splice(sales.effects.indexOf(effect), 1);
  }
  sales.spawnTimer -= delta;
  if (sales.spawnTimer <= 0 && sales.visitors.length < salesConfig.visitor.maxActive) {
    const id = sales.nextId++;
    const fromLeft = id % 2 === 1;
    const slots = [0.18, 0.5, 0.82];
    sales.visitors.push({ id, type: chooseCustomerType(sales.visitors), x: fromLeft ? -0.18 : 1.18, targetX: slots[id % slots.length], exitX: fromLeft ? -0.22 : 1.22, timer: debug ? salesConfig.visitor.debugStay : salesConfig.visitor.normalStay, state: "arriving" });
    sales.spawnTimer = debug ? salesConfig.visitor.debugInterval : salesConfig.visitor.normalInterval;
  }
  for (const visitor of [...sales.visitors]) {
    const destination = visitor.state === "leaving" ? visitor.exitX : visitor.targetX;
    visitor.x += (destination - visitor.x) * delta * (visitor.state === "leaving" ? salesConfig.visitor.leavingSpeed : salesConfig.visitor.arrivingSpeed);
    if (visitor.state === "leaving") {
      if (Math.abs(visitor.x - visitor.exitX) < 0.025) sales.visitors.splice(sales.visitors.indexOf(visitor), 1);
      continue;
    }
    const visibleFish = fish.filter((item) => item.tank === "sale");
    const focus = visibleFish.sort((a, b) => customerScore(b, visitor.type) - customerScore(a, visitor.type))[0];
    if (focus) {
      visitor.focusFishId = focus.id;
      visitor.gazeTimer = (visitor.gazeTimer ?? 0) - delta;
      if (visitor.gazeTimer <= 0 || !Number.isFinite(visitor.gazeTargetX)) {
        const glanceFish = Math.random() < 0.28
          ? visibleFish[Math.floor(Math.random() * visibleFish.length)] ?? focus
          : focus;
        visitor.gazeTargetX = glanceFish.x + (Math.random() - 0.5) * 90;
        visitor.gazeTargetY = glanceFish.y + (Math.random() - 0.5) * 55;
        visitor.gazeTimer = 0.45 + Math.random() * 1.8;
      }
      const gazeEase = Math.min(1, delta * (2.4 + Math.random() * 1.2));
      visitor.lookX = Number.isFinite(visitor.lookX)
        ? visitor.lookX + (visitor.gazeTargetX - visitor.lookX) * gazeEase
        : visitor.gazeTargetX;
      visitor.lookY = Number.isFinite(visitor.lookY)
        ? visitor.lookY + (visitor.gazeTargetY - visitor.lookY) * gazeEase
        : visitor.gazeTargetY;
    }
    if (Math.abs(visitor.x - visitor.targetX) > 0.02) continue;
    visitor.state = "watching";
    visitor.timer -= delta;
    if (visitor.timer > 0) continue;
    const chosen = visibleFish[0];
    if (chosen && Math.random() < purchaseChance(chosen)) {
      const price = chosen.salePrice ?? fishValue(chosen);
      economy.coins += price;
      fish.splice(fish.indexOf(chosen), 1);
      sales.effects.push({ x: chosen.x, y: chosen.y, price, timer: 3.2 });
      onSale(chosen, price, visitor.type);
    }
    visitor.state = "leaving";
  }
}

function customerScore(item, type) {
  const rarity = salesConfig.rarityValue[item.rarity] ?? salesConfig.rarityValue.Common;
  const illnessPenalty = item.diseases?.length ? 300 : item.symptoms?.length ? 95 : 0;
  if (type === 0) return 100 - (item.salePrice ?? 10) + item.traits.length * 4 - illnessPenalty;
  if (type === 1) return item.health + item.traits.length * 8 - illnessPenalty;
  if (type === 2) return rarity * 3 + (item.pattern === "glow" ? 35 : 0)
    + (colorLineForFish(item)?.valueBonus ?? 0) * 160 - illnessPenalty;
  return item.health + (item.parents?.length ? 25 : 0) - illnessPenalty;
}

function purchaseChance(item) {
  if (item.diseases?.length) return salesConfig.purchaseChance.diseased;
  if (item.symptoms?.length) return salesConfig.purchaseChance.symptomatic;
  const health = item.visibleHealth ?? item.health ?? 100;
  if (health < 40) return salesConfig.purchaseChance.weak;
  if (health < 65) return salesConfig.purchaseChance.reduced;
  return salesConfig.purchaseChance.healthy;
}
