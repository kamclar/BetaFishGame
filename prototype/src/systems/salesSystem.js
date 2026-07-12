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
    if (Math.random() < appeal) sold.push({ item, price: item.salePrice ?? fishValue(item) });
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
      visitor.lookX = focus.x;
      visitor.lookY = focus.y;
    }
    if (Math.abs(visitor.x - visitor.targetX) > 0.02) continue;
    visitor.state = "watching";
    visitor.timer -= delta;
    if (visitor.timer > 0) continue;
    const chosen = visibleFish[0];
    if (chosen && Math.random() < 0.72) {
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
  if (type === 0) return 100 - (item.salePrice ?? 10) + item.traits.length * 4;
  if (type === 1) return item.health + item.traits.length * 8;
  if (type === 2) return rarity * 3 + (item.pattern === "glow" ? 35 : 0);
  return item.health + (item.parents?.length ? 25 : 0);
}
