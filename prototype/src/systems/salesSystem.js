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
