import { projectGeneralEncounterRules } from "./general-encounter-rules-master.js";
import { buildGeneralEncounterSpeciesPool } from "./general-encounter-species-pools.js";

function moduloIndex(value, length, label) {
  if (!Number.isInteger(value)) throw new TypeError(`${label} must be an integer`);
  if (!Number.isInteger(length) || length <= 0) throw new RangeError(`${label} pool must not be empty`);
  return ((value % length) + length) % length;
}

export function resolveGeneralTypeEncounterRuntime({
  day,
  requiredType,
  enemyRank = "NORMAL",
  extraModifier = 0,
  speciesIndex = 0,
  varianceIndex = 1,
  useVariance = true,
} = {}) {
  if (!Number.isInteger(day) || day < 1) throw new RangeError("day must be >= 1");
  if (typeof requiredType !== "string" || requiredType.length === 0) {
    throw new TypeError("requiredType must be a non-empty type id");
  }
  if (!Number.isInteger(extraModifier)) throw new TypeError("extraModifier must be an integer");

  const rules = projectGeneralEncounterRules();
  const scaling = rules.enemyScaling;
  const rankModifier = scaling.rankModifiers[enemyRank];
  if (!Number.isInteger(rankModifier)) throw new RangeError(`unknown enemy rank: ${enemyRank}`);

  // Canonical EnemyScaling.calculate: Day -> scaling -> rank/event modifiers,
  // clamp the scaling value at 0, then convert it to the deterministic base level.
  const dayScaling = Math.floor((day - 1) / scaling.dayInterval);
  const effectiveScaling = Math.max(dayScaling + rankModifier + extraModifier, 0);
  const baseLevel = Math.max(
    scaling.minLevel,
    Math.min(scaling.maxLevel, scaling.baseLevel + effectiveScaling * scaling.levelsPerScaling),
  );

  // Canonical GeneralTypeEncounter chooses the evolution-stage band from the
  // deterministic base level before the encounter-level variance is applied.
  const band = rules.stageBands.find((entry) => baseLevel >= entry.minLevel && baseLevel <= entry.maxLevel);
  if (!band) throw new Error(`no canonical stage band for base level ${baseLevel}`);
  const pool = buildGeneralEncounterSpeciesPool(requiredType, band.stages);
  if (pool.length === 0) throw new Error(`empty canonical General Encounter pool for ${requiredType} at Lv.${baseLevel}`);

  // Ruby owns random sampling. Portable/browser callers inject the resolved
  // sample indexes; this module only applies the canonical selected values.
  const selectedSpeciesIndex = moduloIndex(speciesIndex, pool.length, "speciesIndex");
  const selectedVarianceIndex = useVariance
    ? moduloIndex(varianceIndex, scaling.levelVarianceValues.length, "varianceIndex")
    : null;
  const variance = useVariance ? scaling.levelVarianceValues[selectedVarianceIndex] : 0;
  const level = Math.max(scaling.minLevel, Math.min(scaling.maxLevel, baseLevel + variance));

  return {
    required_type: requiredType,
    species_id: pool[selectedSpeciesIndex],
    base_level: baseLevel,
    variance,
    level,
    min_level: scaling.minLevel,
    max_level: scaling.maxLevel,
    selection: {
      enemy_rank: enemyRank,
      rank_modifier: rankModifier,
      day_scaling: dayScaling,
      effective_scaling: effectiveScaling,
      allowed_stages: [...band.stages],
      pool_size: pool.length,
      species_index: selectedSpeciesIndex,
      variance_index: selectedVarianceIndex,
    },
  };
}
