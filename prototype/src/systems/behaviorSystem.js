import { behaviorConfig, dayNightConfig } from "../config/behaviorConfig.js";
import { breedingConfig } from "../config/breedingConfig.js";

export function daylightAt(minute) {
  const hour = (minute / 60) % 24;
  const day = dayNightConfig;
  if (hour < day.nightEndHour || hour >= day.duskEndHour) return day.nightLight;
  if (hour < day.dawnEndHour) return day.nightLight + smooth((hour - day.nightEndHour) / (day.dawnEndHour - day.nightEndHour)) * (1 - day.nightLight);
  if (hour < day.dayEndHour) return 1;
  if (hour < day.duskEndHour) return 1 - smooth((hour - day.dayEndHour) / (day.duskEndHour - day.dayEndHour)) * (1 - day.nightLight);
  return day.nightLight;
}

export function dayPeriod(minute) {
  const hour = (minute / 60) % 24;
  if (hour < dayNightConfig.nightEndHour) return "noc";
  if (hour < dayNightConfig.dawnEndHour) return "svitani";
  if (hour < dayNightConfig.dayEndHour) return "den";
  if (hour < dayNightConfig.duskEndHour) return "soumrak";
  return "noc";
}

export function updateFishBehavior(item, delta, context) {
  const { minute, tankFish, glass, surfaceY, floorY, foodPresent } = context;
  const light = daylightAt(minute);
  const nocturnal = item.traits.includes("nocni") || item.traits.includes("bezesny");
  const restActivity = nocturnal ? (light < 0.34 ? behaviorConfig.nocturnalNightActivity : behaviorConfig.nocturnalDayActivity) : (light < 0.24 ? behaviorConfig.diurnalNightActivity : light < 0.55 ? behaviorConfig.twilightActivity : behaviorConfig.dayActivity);
  const mates = tankFish.filter((other) => other.id !== item.id && other.sex !== item.sex && other.canBreed && other.health >= breedingConfig.minimumHealth && other.stress < breedingConfig.maximumStress);
  const mate = item.tank === "nursery" && item.canBreed ? mates[0] : null;
  const school = tankFish.filter((other) => other.id !== item.id && other.species === item.species && item.category === "shoaling");

  item.behaviorClock = (item.behaviorClock ?? 0) - delta;
  if (item.behaviorClock <= 0 || !Number.isFinite(item.behaviorTargetY)) {
    item.behaviorClock = behaviorConfig.wanderSecondsMin + seededUnit(item.id, Math.floor(minute / 20)) * behaviorConfig.wanderSecondsRange;
    item.behaviorTargetY = surfaceY + 45 + seededUnit(`${item.id}:y`, Math.floor(minute / 20)) * Math.max(40, floorY - surfaceY - 115);
  }

  let state = nocturnal && light >= 0.55 ? "ukryva se pred svetlem" : light < 0.24 && !nocturnal ? "odpociva" : nocturnal && light < 0.34 ? "nocni aktivita" : "prozkoumava nadrz";
  let speedMultiplier = restActivity;
  let targetY = item.behaviorTargetY;
  let targetX = null;

  if (item.traits.includes("hlubinna")) {
    targetY = floorY - behaviorConfig.deepFloorMin - seededUnit(item.id, 3) * behaviorConfig.deepFloorRange;
    if (state === "prozkoumava nadrz") state = "drzi se u dna";
  }
  if (item.traits.includes("jeskynni") && light > 0.45) {
    targetY = floorY - behaviorConfig.caveFloorDistance;
    targetX = seededUnit(item.id, 8) > 0.5 ? glass.left + behaviorConfig.caveEdgeDistance : glass.right - behaviorConfig.caveEdgeDistance;
    state = "hleda stin";
    speedMultiplier *= 0.55;
  }
  if (school.length) {
    const wholeSchool = [item, ...school];
    const centerX = wholeSchool.reduce((sum, other) => sum + other.x, 0) / wholeSchool.length;
    const centerY = wholeSchool.reduce((sum, other) => sum + other.y, 0) / wholeSchool.length;
    const slotAngle = seededUnit(`${item.id}:slot`, 1) * Math.PI * 2;
    const slotRadius = behaviorConfig.schoolRadiusMin + seededUnit(`${item.id}:radius`, 1) * behaviorConfig.schoolRadiusRange;
    targetX = centerX + Math.cos(slotAngle) * slotRadius;
    targetY = centerY + Math.sin(slotAngle) * slotRadius * 0.55;
    const nearest = school.reduce((best, other) => {
      const distance = Math.hypot(other.x - item.x, other.y - item.y);
      return distance < best.distance ? { fish: other, distance } : best;
    }, { fish: null, distance: Infinity });
    if (nearest.fish && nearest.distance < behaviorConfig.separationDistance) {
      targetX += (item.x - nearest.fish.x) * 0.8;
      targetY += (item.y - nearest.fish.y) * 0.55;
    }
    const wanted = item.preferredSchoolSize ?? 5;
    state = wholeSchool.length >= wanted ? "plave v hejnu" : `hleda hejno ${wholeSchool.length}/${wanted}`;
    speedMultiplier *= 0.9;
  }
  if (mate && light > 0.3) {
    const orbit = Math.sin(minute * 0.035 + seededUnit(item.id, 5) * Math.PI * 2);
    targetX = mate.x - mate.dir * (behaviorConfig.courtshipDistance + orbit * behaviorConfig.courtshipOrbitX);
    targetY = mate.y + orbit * behaviorConfig.courtshipOrbitY;
    state = "dvori se partnerovi";
    speedMultiplier = 0.82;
  }
  if (foodPresent && item.hunger > 18) {
    state = "hleda potravu";
    speedMultiplier = Math.max(1.05, speedMultiplier);
  }

  if (Number.isFinite(targetX) && Math.abs(targetX - item.x) > 10) item.dir = targetX > item.x ? 1 : -1;
  item.y += (targetY - item.y) * Math.min(1, delta * (state === "odpociva" ? 0.12 : 0.3));
  item.behaviorState = state;
  item.activityLevel = speedMultiplier;
  return { speedMultiplier };
}

function smooth(value) {
  const x = Math.max(0, Math.min(1, value));
  return x * x * (3 - 2 * x);
}

function seededUnit(seed, step) {
  let hash = 2166136261;
  for (const char of `${seed}:${step}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) / 4294967295;
}
