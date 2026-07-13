export const cs = {
  "event.day_started": ({ day }) => `Den ${day}: zacina novy den v akvariu.`,
  "event.tank_cleaned": ({ day, tank }) => `Den ${day}: vycistena nadrz ${tank}.`,
  "event.water_test": ({ day, tank, quality, waste }) => `Den ${day}: ${tank}, voda ${quality}, necistoty ${waste} %.`,
  "event.no_money": ({ day, cost = "" }) => `Den ${day}: nedostatek penez${cost === "" ? "" : ` (cena ${cost})`}.`,
  "event.tutorial_complete": ({ task }) => `Seznameni dokonceno: ${task}.`,
  "event.task_complete": ({ task, reward }) => `Cil splnen: ${task}. Odmena ${reward} penez.`,
  "ui.day": ({ day }) => `Den ${day}`,
  "ui.coins": ({ coins }) => `${coins} penez`,
  "ui.water": ({ quality }) => `Voda: ${quality}`,
};
