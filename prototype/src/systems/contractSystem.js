import { categoryName } from "../data/speciesData.js";

const colors = { blue: "modrou", amber: "medovou", violet: "fialovou", pale: "světlou", black: "černou" };
const tails = { short: "krátkými ploutvemi", fork: "vidlicovým ocasem", veil: "závojovým ocasem" };
const patterns = { plain: "bez kresby", spots: "se skvrnami", stripe: "s pruhy", glow: "se světelným vzorem" };

export function ensureContract(economy) {
  if (economy.contract) return economy.contract;
  const choices = [
    () => ({ key: "color", value: randomKey(colors), reward: 42 }),
    () => ({ key: "tail", value: randomKey(tails), reward: 48 }),
    () => ({ key: "pattern", value: randomKey(patterns), reward: 54 }),
    () => ({ key: "category", value: ["shoaling", "labyrinth", "bottom", "cave"][Math.floor(Math.random() * 4)], reward: 60 }),
  ];
  const requirement = choices[Math.floor(Math.random() * choices.length)]();
  economy.contract = { ...requirement, minHealth: 75, completed: false };
  return economy.contract;
}

export function contractText(contract) {
  if (!contract) return "Zakázka se připravuje";
  const value = contract.key === "color" ? colors[contract.value]
    : contract.key === "tail" ? tails[contract.value]
      : contract.key === "pattern" ? patterns[contract.value]
        : `z kategorie ${categoryName(contract.value)}`;
  return `Zakázka: zdravá ryba ${value} · odměna ${contract.reward} peněz`;
}

export function recordContractSale(item, economy) {
  const contract = ensureContract(economy);
  if ((item.health ?? 0) < contract.minHealth || item.diseases?.length || item[contract.key] !== contract.value) return 0;
  const reward = contract.reward;
  economy.coins += reward;
  economy.completedContracts = (economy.completedContracts ?? 0) + 1;
  economy.contract = null;
  ensureContract(economy);
  return reward;
}

function randomKey(object) {
  const keys = Object.keys(object);
  return keys[Math.floor(Math.random() * keys.length)];
}
