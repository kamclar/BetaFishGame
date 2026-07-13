const rarityValue = { Common: 8, Uncommon: 15, Rare: 28, Exotic: 52, Mythic: 95, Eldritch: 170 };

export function fishValue(item) {
  const base = rarityValue[item.rarity] ?? 8;
  const healthFactor = 0.45 + (item.visibleHealth ?? item.health) / 100 * 0.55;
  const ageFactor = item.lifeStage === "adult" ? 1.25 : item.lifeStage === "youngAdult" ? 1 : 0.65;
  return Math.max(3, Math.round(base * healthFactor * ageFactor + item.traits.length * 2 + (item.parents?.length ? 4 : 0)));
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
    const appeal = 0.4 + Math.min(0.42, item.traits.length * 0.08 + (item.rarity !== "Common" ? 0.14 : 0));
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

export function updateLiveSales(delta, tank, fish, economy, onSale) {
  const sales = tank.sales;
  if (!sales?.active) return;
  sales.effects ??= [];
  for (const effect of [...sales.effects]) {
    effect.timer -= delta;
    if (effect.timer <= 0) sales.effects.splice(sales.effects.indexOf(effect), 1);
  }
  sales.spawnTimer -= delta;
  if (sales.spawnTimer <= 0 && sales.visitors.length < 3) {
    const id = sales.nextId++;
    const fromLeft = id % 2 === 1;
    const slots = [0.18, 0.5, 0.82];
    sales.visitors.push({ id, type: Math.floor(Math.random() * 4), x: fromLeft ? -0.18 : 1.18, targetX: slots[id % slots.length], exitX: fromLeft ? -0.22 : 1.22, timer: debug ? 7 : 24, state: "arriving" });
    sales.spawnTimer = debug ? 6 : 35;
  }
  for (const visitor of [...sales.visitors]) {
    const destination = visitor.state === "leaving" ? visitor.exitX : visitor.targetX;
    visitor.x += (destination - visitor.x) * delta * (visitor.state === "leaving" ? 0.16 : 0.34);
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
  const rarity = rarityValue[item.rarity] ?? 8;
  const illnessPenalty = item.diseases?.length ? 300 : item.symptoms?.length ? 95 : 0;
  if (type === 0) return 100 - (item.salePrice ?? 10) + item.traits.length * 4 - illnessPenalty;
  if (type === 1) return item.health + item.traits.length * 8 - illnessPenalty;
  if (type === 2) return rarity * 3 + (item.pattern === "glow" ? 35 : 0) - illnessPenalty;
  return item.health + (item.parents?.length ? 25 : 0) - illnessPenalty;
}

function purchaseChance(item) {
  if (item.diseases?.length) return 0.015;
  if (item.symptoms?.length) return 0.08;
  const health = item.visibleHealth ?? item.health ?? 100;
  if (health < 40) return 0.12;
  if (health < 65) return 0.34;
  return 0.72;
}
