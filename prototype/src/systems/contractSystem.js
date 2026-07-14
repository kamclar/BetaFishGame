import { categoryName } from "../data/speciesData.js";
import { contractConfig } from "../config/economyConfig.js";

const colors = { blue: "modrou", amber: "medovou", violet: "fialovou", pale: "světlou", black: "černou" };
const tails = { short: "krátkými ploutvemi", fork: "vidlicovým ocasem", veil: "závojovým ocasem" };
const patterns = { plain: "bez kresby", spots: "se skvrnami", stripe: "s pruhy", glow: "se světelným vzorem" };

export function ensureContract(economy) {
  if (economy.contract) return economy.contract;
  const choices = [
    () => ({ key: "color", value: randomKey(colors), reward: contractConfig.rewards.color }),
    () => ({ key: "tail", value: randomKey(tails), reward: contractConfig.rewards.tail }),
    () => ({ key: "pattern", value: randomKey(patterns), reward: contractConfig.rewards.pattern }),
    () => ({ key: "category", value: contractConfig.categories[Math.floor(Math.random() * contractConfig.categories.length)], reward: contractConfig.rewards.category }),
  ];
  const requirement = choices[Math.floor(Math.random() * choices.length)]();
  economy.contract = { ...requirement, minHealth: contractConfig.minimumHealth, completed: false };
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
  if ((item.health ?? 0) < contract.minHealth || item.diseases?.length || item[contract.key] !== contract.value) return null;
  const reward = contract.reward;
  economy.coins += reward;
  economy.completedContracts = (economy.completedContracts ?? 0) + 1;
  economy.contract = null;
  ensureContract(economy);
  return { reward, skillXp: contractConfig.skillXp };
}

function randomKey(object) {
  const keys = Object.keys(object);
  return keys[Math.floor(Math.random() * keys.length)];
}
