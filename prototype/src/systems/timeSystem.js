import { timeConfig } from "../config/timeConfig.js";

export const debugTime = new URLSearchParams(location.search).has("debugTime");

// Normalne plyne herni cas stejne rychle jako skutecny. V debug rezimu trva den 24 sekund.
export const gameMinutesPerRealSecond = debugTime ? timeConfig.debugGameMinutesPerRealSecond : timeConfig.normalGameMinutesPerRealSecond;

export function gameDaysElapsed(realSeconds) {
  return realSeconds * gameMinutesPerRealSecond / timeConfig.minutesPerDay;
}

export function simulationSeconds(realSeconds) {
  return gameDaysElapsed(realSeconds) * 86400;
}
