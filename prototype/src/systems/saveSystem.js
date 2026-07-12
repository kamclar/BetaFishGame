const SAVE_KEY = "beta-fish-game.save.v1";

export function saveGame(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 4, savedAt: Date.now(), ...state }));
}

export function loadGame() {
  try {
    const value = localStorage.getItem(SAVE_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function clearSavedGame() {
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem("beta-fish-game.journal.v1");
}

export function restoreArray(target, saved) {
  if (!Array.isArray(saved)) return;
  target.splice(0, target.length, ...saved);
}

export function restoreObject(target, saved) {
  if (!saved || typeof saved !== "object") return;
  Object.assign(target, saved);
}
