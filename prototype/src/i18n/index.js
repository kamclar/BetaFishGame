import { cs } from "./cs.js";

const dictionaries = { cs };
let locale = "cs";

export function t(key, values = {}) {
  const entry = dictionaries[locale]?.[key];
  if (typeof entry === "function") return entry(values);
  return entry ?? key;
}
