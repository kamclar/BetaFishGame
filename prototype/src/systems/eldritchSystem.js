const seedTraits = new Set(["hlubinna", "jeskynni", "nocni", "echolokacni"]);
const corruptedTraits = {
  klidna: "nehybnyPohled",
  skvrnita: "putujiciKresba",
  nocni: "bezesny",
  stihla: "hadovityPohyb",
  hlubinna: "slysiHlubiny",
  necitelna: "prazdnyOdraz",
  elektricka: "studeneSvetlo",
  ostra: "kostenePaprsky",
  plodna: "ciziSnuska",
  robustni: "ciziMetabolismus",
  jeskynni: "vidiZaSklem",
  slepa: "vnitrniZrak",
  echolokacni: "volaniHlubin",
};

export function applyEldritchLineage(baby, a, b, context = {}) {
  const highest = Math.max(a.eldritchStage ?? 0, b.eldritchStage ?? 0);
  const lowest = Math.min(a.eldritchStage ?? 0, b.eldritchStage ?? 0);
  const hour = Math.floor((context.minute ?? 12 * 60) / 60);
  const isNight = hour >= 21 || hour < 5;
  const cleanWater = (context.waterQuality ?? 0) >= 0.88;
  let stage = 0;

  if (highest === 0) {
    const receptiveLine = [...(a.traits ?? []), ...(b.traits ?? [])].some((trait) => seedTraits.has(trait));
    const chance = context.debug && receptiveLine ? 1 : receptiveLine && isNight && cleanWater ? 0.18 : receptiveLine ? 0.025 : 0.004;
    if (Math.random() < chance) stage = 1;
  } else {
    const requiredPartnerStage = highest >= 3 ? 2 : 1;
    const canAdvance = lowest >= requiredPartnerStage && (context.debug || (isNight && cleanWater));
    const advanceChances = { 1: 0.5, 2: 0.42, 3: 0.34, 4: 0.25, 5: 0 };
    const advanceChance = context.debug && canAdvance ? 1 : canAdvance ? advanceChances[highest] : 0;
    stage = Math.random() < advanceChance
      ? Math.min(5, highest + 1)
      : (Math.random() < 0.8 ? highest : Math.max(0, highest - 1));
  }

  if (stage > 0) applyStage(baby, stage);
  return stage;
}

export function eldritchJournalEntry(babies) {
  const stage = Math.max(0, ...babies.map((baby) => baby.eldritchStage ?? 0));
  if (stage === 1) return "U jednoho poteru se objevila ploutev, ktera neodpovida zadnemu znamemu znaku. Ve tme se nepatrne stahuje za pohybem kolem nadrze.";
  if (stage === 2) return "Na hrbetu nositele vyrostly tvrde paprsky a kresba po setmeni slabe svetelkuje. Anomalie uz neni jen v jedine ploutvi.";
  if (stage === 3) return "Ocas dalsi generace se rozdelil do mekkych laloku. Ryba se obcas zastavi a diva se do prazdneho rohu nadrze.";
  if (stage === 4) return "Nova ryba je stale rozpoznatelna jako ryba, ale pod hlavnim okem se otevřely dve mensi. Kolem tlamy se pohybuji kratke vousky.";
  if (stage === 5) return "Vylihl se Hlubinny svedek. Vsechny ostatni ryby se od nej drzi dal a voda je na okamzik uplne ticha.";
  return null;
}

function applyStage(baby, stage) {
  baby.eldritchStage = stage;
  baby.specialSprite = null;
  baby.ventralFin = "eldritch";
  baby.rarity = "Exotic";
  baby.traits = [...new Set([...(baby.traits ?? []), "neznamyVyrustek"] )];
  replaceNormalTraits(baby, stage);
  baby.healthNote = "Zdrava, ale jeji nova ploutev nema znamou anatomii.";

  if (stage >= 2) {
    baby.dorsalFin = "spiky";
    baby.pattern = "glow";
    baby.traits = [...new Set([...baby.traits, "hlubinnaOdezva"] )];
    baby.healthNote = "Po setmeni reaguje na pohyb, ktery ostatni ryby nevnimaji.";
  }
  if (stage >= 3) {
    baby.rarity = "Mythic";
    baby.tail = "eldritch";
    baby.traits = [...new Set([...baby.traits, "promenenyOcas"] )];
  }
  if (stage === 4) {
    baby.traits = [...new Set([...baby.traits, "ociPodKuzi"] )];
    baby.healthNote = "Pod kuzi hlavy se pri krmeni na okamzik otevrou dalsi oci.";
  }
  if (stage === 5) {
    baby.name = "Svedek";
    baby.species = "Hlubinny svedek";
    baby.category = "oddity";
    baby.rarity = "Eldritch";
    baby.specialSprite = "cthulhu";
    baby.traits = [...new Set([...baby.traits, "mnohooci", "volaniHlubin"] )];
    baby.healthNote = "Je zdrava. Otazka je, zda se na ni vztahuji bezna pravidla zdravi.";
  }
}

function replaceNormalTraits(baby, stage) {
  let remaining = Math.max(1, stage);
  baby.traits = (baby.traits ?? []).map((trait) => {
    const replacement = corruptedTraits[trait];
    if (!replacement || remaining <= 0) return trait;
    remaining -= 1;
    return replacement;
  });
}
