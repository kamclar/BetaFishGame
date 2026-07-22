export const economyDefaults = {
  coins: 36, completedTasks: 0, skillXp: 0, filterLevel: 1,
  dailyGoals: [], goalDay: 0, supplies: { food: 12 },
};

// Dva prubezne ukoly. Neexpiruji o pulnoci, novy se objevi az po splneni stareho.
export const dailyGoalCount = 2;
export const dailyGoalOffsets = [0, 2];
export const dailyGoalTemplates = [
  { id: "feed", label: "Nakrm ryby", target: 2, reward: 6, skillXp: 1 },
  { id: "test", label: "Otestuj vodu", target: 1, reward: 4, skillXp: 1 },
  { id: "clean", label: "Vycisti nadrz", target: 1, reward: 9, skillXp: 2 },
  { id: "plant", label: "Zasad rostlinu", target: 1, reward: 12, skillXp: 2 },
  { id: "breed", label: "Nech ryby naklast jikry", target: 1, reward: 20, skillXp: 4 },
  { id: "sell", label: "Prodej rybu zakaznikovi", target: 1, reward: 16, skillXp: 3 },
];

export const skillRanks = [
  { min: 0, name: "Ucen" }, { min: 8, name: "Pecovatel" },
  { min: 15, name: "Chovatel" }, { min: 25, name: "Odbornik" },
  { min: 50, name: "Mistr chovu" },
];

export const shopUnlocks = { food: 0, plant: 0, snail: 8, eggs: 15, filter: 25, heater: 8, aerator: 8 };
export const actionCosts = {
  feed: 0, foodPack: 10, plant: 8, plantVallisneria: 8, plantAnubias: 12,
  plantLudwigia: 10, plantFern: 14, plantFloating: 16,
  medicine: 6, clean: 0, test: 0, scrape: 0,
  snail: 45, eggs: 28, filterUpgrade: 65, heater: 55, aerator: 48,
};
export const supplyPackSizes = { food: 12 };
export const contractConfig = {
  rewards: { color: 42, tail: 48, pattern: 54, category: 60 },
  minimumHealth: 75,
  skillXp: 6,
  categories: ["shoaling", "labyrinth", "bottom", "cave"],
};
