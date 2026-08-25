import { buildGeneralEncounterSpeciesPool } from "./general-encounter-species-pools.js";
import { projectGeneralEncounterRules } from "./general-encounter-rules-master.js";
import { RubyMT19937Random } from "./ruby-mt19937-random.js";
import { borrowSafariSharedRunRandomInt } from "./safari-encounter-randomization.js";

// v0.9.108 MaplessDayBoard::TYPE_IDS order. The no-explicit-type branch of
// start_trainer_battle samples this shared/global list before create_encounter
// temporarily seeds the encounter-local RNG with event seed + 1.
export const MAPLESS_DAY_BOARD_TYPE_IDS_V108 = Object.freeze([
  "NORMAL", "FIRE", "WATER", "ELECTRIC", "GRASS", "ICE",
  "FIGHTING", "POISON", "GROUND", "FLYING", "PSYCHIC", "BUG",
  "ROCK", "GHOST", "DRAGON", "DARK", "STEEL", "FAIRY",
]);

function integer(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number)) throw new TypeError(`${label} must be an integer`);
  return number;
}

export function selectMaplessNormalEventExtraTrainerType(runtime, explicitType = null) {
  if (explicitType != null && String(explicitType).length > 0) {
    const type = String(explicitType).toUpperCase();
    if (!MAPLESS_DAY_BOARD_TYPE_IDS_V108.includes(type)) throw new RangeError(`unknown canonical type: ${type}`);
    return { type, borrowedSharedRunRng: false, typeIndex: MAPLESS_DAY_BOARD_TYPE_IDS_V108.indexOf(type) };
  }
  const typeIndex = borrowSafariSharedRunRandomInt(runtime, MAPLESS_DAY_BOARD_TYPE_IDS_V108.length);
  return {
    type: MAPLESS_DAY_BOARD_TYPE_IDS_V108[typeIndex],
    borrowedSharedRunRng: true,
    typeIndex,
  };
}

export function planMaplessNormalEventExtraTrainerEncounter({
  day,
  requiredType,
  extraModifier = 0,
  seed,
} = {}) {
  const normalizedDay = integer(day, "day");
  if (normalizedDay < 1) throw new RangeError("day must be >= 1");
  const modifier = integer(extraModifier, "extraModifier");
  const eventSeed = integer(seed, "seed");
  const type = String(requiredType ?? "").toUpperCase();
  if (!MAPLESS_DAY_BOARD_TYPE_IDS_V108.includes(type)) throw new RangeError(`unknown canonical type: ${type}`);

  const rules = projectGeneralEncounterRules();
  const scaling = rules.enemyScaling;
  const rankModifier = scaling.rankModifiers.NORMAL;
  const dayScaling = Math.floor((normalizedDay - 1) / scaling.dayInterval);
  const effectiveScaling = Math.max(dayScaling + rankModifier + modifier, 0);
  const baseLevel = Math.max(
    scaling.minLevel,
    Math.min(scaling.maxLevel, scaling.baseLevel + effectiveScaling * scaling.levelsPerScaling),
  );
  const band = rules.stageBands.find((entry) => baseLevel >= entry.minLevel && baseLevel <= entry.maxLevel);
  if (!band) throw new Error(`no canonical stage band for base level ${baseLevel}`);
  const pool = buildGeneralEncounterSpeciesPool(type, band.stages);
  if (pool.length === 0) throw new Error(`empty canonical General Encounter pool for ${type} at Lv.${baseLevel}`);

  // v0.9.108 create_encounter(seed + 1) calls EnemyScaling.calculate first,
  // which samples level variance, then picks the species from the GENERAL pool.
  const encounterSeed = (eventSeed + 1) >>> 0;
  const rng = new RubyMT19937Random(encounterSeed);
  const varianceIndex = rng.randInt(scaling.levelVarianceValues.length);
  const speciesIndex = rng.randInt(pool.length);

  return Object.freeze({
    requiredType: type,
    encounterSeed,
    extraModifier: modifier,
    varianceIndex,
    speciesIndex,
    poolSize: pool.length,
  });
}
