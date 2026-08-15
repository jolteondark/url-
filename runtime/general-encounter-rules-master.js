const RAW_GENERAL_ENCOUNTER_RULES = Object.freeze({
  id: "GENERAL_TYPE_ENCOUNTER",
  version: "0.1.2",
  generalCategory: "GENERAL",
  stageBands: Object.freeze([
    Object.freeze({ minLevel: 1, maxLevel: 15, stages: Object.freeze(["NO_EVOLUTION", "ONE_EVOLUTION_BASE", "TWO_EVOLUTION_BASE"]) }),
    Object.freeze({ minLevel: 16, maxLevel: 24, stages: Object.freeze(["NO_EVOLUTION", "ONE_EVOLUTION_BASE", "TWO_EVOLUTION_MIDDLE"]) }),
    Object.freeze({ minLevel: 25, maxLevel: 35, stages: Object.freeze(["NO_EVOLUTION", "ONE_EVOLUTION_FINAL", "TWO_EVOLUTION_MIDDLE"]) }),
    Object.freeze({ minLevel: 36, maxLevel: 100, stages: Object.freeze(["NO_EVOLUTION", "ONE_EVOLUTION_FINAL", "TWO_EVOLUTION_FINAL"]) }),
  ]),
  enemyScaling: Object.freeze({
    version: "0.1.2",
    dayInterval: 5,
    baseLevel: 3,
    levelsPerScaling: 2,
    minLevel: 1,
    maxLevel: 100,
    levelVarianceValues: Object.freeze([-1, 0, 1]),
    rankModifiers: Object.freeze({ WEAK: -2, NORMAL: 0, STRONG: 2, VERY_STRONG: 4 }),
  }),
});

export function validateGeneralEncounterRules(rules = RAW_GENERAL_ENCOUNTER_RULES) {
  if (rules.generalCategory !== "GENERAL") throw new Error("general category mismatch");
  const bands = rules.stageBands;
  if (!Array.isArray(bands) || bands.length !== 4) throw new Error("four stage bands required");
  const expected = [[1,15],[16,24],[25,35],[36,100]];
  bands.forEach((band, i) => {
    if (band.minLevel !== expected[i][0] || band.maxLevel !== expected[i][1]) throw new Error("stage band boundary mismatch");
    if (!Array.isArray(band.stages) || band.stages.length !== 3) throw new Error("three stages required per band");
  });
  const s = rules.enemyScaling;
  if (s.dayInterval !== 5 || s.baseLevel !== 3 || s.levelsPerScaling !== 2 || s.minLevel !== 1 || s.maxLevel !== 100) throw new Error("enemy scaling constants mismatch");
  if (JSON.stringify(s.levelVarianceValues) !== "[-1,0,1]") throw new Error("variance mismatch");
  const expectedRanks = { WEAK: -2, NORMAL: 0, STRONG: 2, VERY_STRONG: 4 };
  if (JSON.stringify(s.rankModifiers) !== JSON.stringify(expectedRanks)) throw new Error("rank modifiers mismatch");
  return true;
}

export function projectGeneralEncounterRules() {
  validateGeneralEncounterRules();
  return JSON.parse(JSON.stringify(RAW_GENERAL_ENCOUNTER_RULES));
}
