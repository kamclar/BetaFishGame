const SAVE_KEY = "beta-fish-game.save.v1";
const SLOT_KEY = "beta-fish-game.save-slots.v1";
const JOURNAL_KEY = "beta-fish-game.journal.v1";
const SLOT_COUNT = 3;

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
  localStorage.removeItem(JOURNAL_KEY);
}

function readSlots() {
  try {
    const slots = JSON.parse(localStorage.getItem(SLOT_KEY) ?? "[]");
    return Array.from({ length: SLOT_COUNT }, (_, index) => slots[index] ?? null);
  } catch {
    return Array.from({ length: SLOT_COUNT }, () => null);
  }
}

function writeSlots(slots) {
  localStorage.setItem(SLOT_KEY, JSON.stringify(slots));
}

export function listSaveSlots() {
  return readSlots().map((slot, index) => slot ? {
    index,
    savedAt: slot.savedAt,
    day: slot.state?.gameClock?.day ?? 1,
    minute: slot.state?.gameClock?.minute ?? 0,
    coins: slot.state?.economy?.coins ?? 0,
    fishCount: Array.isArray(slot.state?.fish) ? slot.state.fish.length : 0,
  } : null);
}

export function saveToSlot(index, state) {
  if (index < 0 || index >= SLOT_COUNT) return false;
  const slots = readSlots();
  slots[index] = {
    version: 1,
    savedAt: Date.now(),
    state: { version: 4, savedAt: Date.now(), ...structuredClone(state) },
    journal: localStorage.getItem(JOURNAL_KEY),
  };
  writeSlots(slots);
  return true;
}

export function loadFromSlot(index) {
  const slot = readSlots()[index];
  if (!slot?.state) return false;
  localStorage.setItem(SAVE_KEY, JSON.stringify(slot.state));
  if (slot.journal == null) localStorage.removeItem(JOURNAL_KEY);
  else localStorage.setItem(JOURNAL_KEY, slot.journal);
  return true;
}

export function deleteSaveSlot(index) {
  if (index < 0 || index >= SLOT_COUNT) return false;
  const slots = readSlots();
  slots[index] = null;
  writeSlots(slots);
  return true;
}

export function restoreArray(target, saved) {
  if (!Array.isArray(saved)) return;
  target.splice(0, target.length, ...saved);
}

export function restoreObject(target, saved) {
  if (!saved || typeof saved !== "object") return;
  Object.assign(target, saved);
}
