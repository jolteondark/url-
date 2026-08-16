import { buildGeneralEncounterSpeciesPool } from "./general-encounter-species-pools.js";
import { projectGeneralEncounterRules } from "./general-encounter-rules-master.js";

function unitRoll(value, label) {
  const roll = Number(value);
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new RangeError(`${label} must be a finite unit roll in [0,1)`);
  }
  return roll;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function resolveGeneralWildEncounter({
  day,
  requiredType,
  enemyRank = "NORMAL",
  extraModifier = 0,
  speciesRoll,
  varianceRoll,
} = {}) {
  if (!Number.isInteger(day) || day < 1) throw new RangeError("day must be >= 1");
  if (typeof requiredType !== "string" || requiredType.length === 0) {
    throw new TypeError("requiredType must be a non-empty type id");
  }
  if (!Number.isInteger(extraModifier)) throw new TypeError("extraModifier must be an integer");

  const speciesUnit = unitRoll(speciesRoll, "speciesRoll");
  const varianceUnit = unitRoll(varianceRoll, "varianceRoll");
  const rules = projectGeneralEncounterRules();
  const scaling = rules.enemyScaling;
  const rankModifier = scaling.rankModifiers[enemyRank];
  if (!Number.isInteger(rankModifier)) throw new RangeError(`unknown enemy rank: ${enemyRank}`);

  const dayScaling = Math.floor((day - 1) / scaling.dayInterval);
  const effectiveScaling = Math.max(dayScaling + rankModifier + extraModifier, 0);
  const baseLevel = clamp(
    scaling.baseLevel + effectiveScaling * scaling.levelsPerScaling,
    scaling.minLevel,
    scaling.maxLevel,
  );
  const band = rules.stageBands.find((entry) => baseLevel >= entry.minLevel && baseLevel <= entry.maxLevel);
  if (!band) throw new Error(`no canonical stage band for base level ${baseLevel}`);

  const pool = buildGeneralEncounterSpeciesPool(requiredType, band.stages);
  if (pool.length === 0) throw new Error(`empty canonical General Encounter pool for ${requiredType} at Lv.${baseLevel}`);
  const speciesIndex = Math.floor(speciesUnit * pool.length);
  const varianceIndex = Math.floor(varianceUnit * scaling.levelVarianceValues.length);
  const levelVariance = scaling.levelVarianceValues[varianceIndex];
  const level = clamp(baseLevel + levelVariance, scaling.minLevel, scaling.maxLevel);

  return {
    schema: "mapless.general-wild-encounter.v1",
    requiredType,
    scaling: {
      enemyRank,
      rankModifier,
      dayScaling,
      effectiveScaling,
      baseLevel,
      allowedStages: [...band.stages],
    },
    poolSize: pool.length,
    speciesIndex,
    speciesId: pool[speciesIndex],
    varianceIndex,
    levelVariance,
    level,
  };
}
