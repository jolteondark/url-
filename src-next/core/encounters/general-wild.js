import { randomInt } from '../rng.js';

export const GENERAL_ENCOUNTER_RULES = Object.freeze({
  stageBands: Object.freeze([
    Object.freeze({ minLevel: 1, maxLevel: 15, stages: Object.freeze(['NO_EVOLUTION','ONE_EVOLUTION_BASE','TWO_EVOLUTION_BASE']) }),
    Object.freeze({ minLevel: 16, maxLevel: 24, stages: Object.freeze(['NO_EVOLUTION','ONE_EVOLUTION_BASE','TWO_EVOLUTION_MIDDLE']) }),
    Object.freeze({ minLevel: 25, maxLevel: 35, stages: Object.freeze(['NO_EVOLUTION','ONE_EVOLUTION_FINAL','TWO_EVOLUTION_MIDDLE']) }),
    Object.freeze({ minLevel: 36, maxLevel: 100, stages: Object.freeze(['NO_EVOLUTION','ONE_EVOLUTION_FINAL','TWO_EVOLUTION_FINAL']) }),
  ]),
  dayInterval: 5,
  baseLevel: 3,
  levelsPerScaling: 2,
  minLevel: 1,
  maxLevel: 100,
  levelVarianceValues: Object.freeze([-1, 0, 1]),
});

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

export function generalWildEncounterPlan({ day, requiredType, enemyRankModifier = 0, extraModifier = 0, speciesPool, speciesIndex, varianceIndex }) {
  if (!Number.isInteger(day) || day < 1) throw new RangeError('day must be >= 1');
  if (typeof requiredType !== 'string' || !requiredType) throw new TypeError('requiredType is required');
  if (!Number.isInteger(enemyRankModifier) || !Number.isInteger(extraModifier)) throw new TypeError('encounter modifiers must be integers');
  if (!Array.isArray(speciesPool) || speciesPool.length === 0) throw new Error('canonical species pool must not be empty');
  if (!Number.isInteger(speciesIndex) || speciesIndex < 0 || speciesIndex >= speciesPool.length) throw new RangeError('speciesIndex outside canonical pool');
  if (!Number.isInteger(varianceIndex) || varianceIndex < 0 || varianceIndex >= GENERAL_ENCOUNTER_RULES.levelVarianceValues.length) throw new RangeError('varianceIndex outside canonical variance values');

  const dayScaling = Math.floor((day - 1) / GENERAL_ENCOUNTER_RULES.dayInterval);
  const effectiveScaling = Math.max(dayScaling + enemyRankModifier + extraModifier, 0);
  const baseLevel = clamp(
    GENERAL_ENCOUNTER_RULES.baseLevel + effectiveScaling * GENERAL_ENCOUNTER_RULES.levelsPerScaling,
    GENERAL_ENCOUNTER_RULES.minLevel,
    GENERAL_ENCOUNTER_RULES.maxLevel,
  );
  const band = GENERAL_ENCOUNTER_RULES.stageBands.find((entry) => baseLevel >= entry.minLevel && baseLevel <= entry.maxLevel);
  if (!band) throw new Error(`no canonical stage band for base level ${baseLevel}`);
  const variance = GENERAL_ENCOUNTER_RULES.levelVarianceValues[varianceIndex];
  const level = clamp(baseLevel + variance, GENERAL_ENCOUNTER_RULES.minLevel, GENERAL_ENCOUNTER_RULES.maxLevel);
  return Object.freeze({
    requiredType,
    allowedStages: band.stages,
    poolSize: speciesPool.length,
    speciesIndex,
    speciesId: String(speciesPool[speciesIndex]),
    varianceIndex,
    variance,
    dayScaling,
    effectiveScaling,
    baseLevel,
    level,
  });
}

export function drawGeneralWildEncounter(rngState, { day, requiredType, speciesPool, enemyRankModifier = 0, extraModifier = 0 }) {
  let state = Number(rngState) >>> 0;
  const species = randomInt(state, speciesPool.length);
  state = species.nextState;
  const variance = randomInt(state, GENERAL_ENCOUNTER_RULES.levelVarianceValues.length);
  state = variance.nextState;
  return Object.freeze({
    nextRngState: state,
    plan: generalWildEncounterPlan({
      day,
      requiredType,
      enemyRankModifier,
      extraModifier,
      speciesPool,
      speciesIndex: species.value,
      varianceIndex: variance.value,
    }),
  });
}
