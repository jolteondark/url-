import { resolveGeneralTypeEncounterRuntime } from "./general-type-encounter-runtime.js";
import { resolveGeneralWildEncounter } from "./general-wild-encounter-resolver.js";
import {
  buildGeneralEncounterSpeciesPool,
  projectGeneralEncounterSpeciesPools,
} from "./general-encounter-species-pools.js";
import { projectGeneralEncounterRules } from "./general-encounter-rules-master.js";
import {
  SAFARI_GENERAL_SPECIES_MASTERS,
  safariCanonicalResetMoves,
} from "./safari-general-encounter-data-loader.js";

const POOLS = projectGeneralEncounterSpeciesPools();
export const SAFARI_GENERAL_TYPES = Object.freeze(Object.keys(POOLS));
export const SAFARI_GENERAL_TYPE_NAMES = Object.freeze({
  BUG: "むし", DARK: "あく", DRAGON: "ドラゴン", ELECTRIC: "でんき",
  FAIRY: "フェアリー", FIGHTING: "かくとう", FIRE: "ほのお", FLYING: "ひこう",
  GHOST: "ゴースト", GRASS: "くさ", GROUND: "じめん", ICE: "こおり",
  NORMAL: "ノーマル", POISON: "どく", PSYCHIC: "エスパー", ROCK: "いわ",
  STEEL: "はがね", WATER: "みず",
});

export function resolveSafariGeneralEncounter({
  day,
  requiredType,
  enemyRank = "NORMAL",
  extraModifier = 0,
  speciesIndex = 0,
  varianceIndex = 1,
  speciesRoll = null,
  varianceRoll = null,
} = {}) {
  if (!SAFARI_GENERAL_TYPES.includes(requiredType)) {
    throw new RangeError(`unknown General Encounter type: ${requiredType}`);
  }

  let resolved;
  if (speciesRoll != null || varianceRoll != null) {
    if (speciesRoll == null || varianceRoll == null) throw new Error("speciesRoll and varianceRoll must be supplied together");
    const owner = resolveGeneralWildEncounter({ day, requiredType, enemyRank, extraModifier, speciesRoll, varianceRoll });
    resolved = {
      required_type: owner.requiredType,
      species_id: owner.speciesId,
      base_level: owner.scaling.baseLevel,
      variance: owner.levelVariance,
      level: owner.level,
      min_level: projectGeneralEncounterRules().enemyScaling.minLevel,
      max_level: projectGeneralEncounterRules().enemyScaling.maxLevel,
      selection: {
        owner_schema: owner.schema,
        enemy_rank: owner.scaling.enemyRank,
        rank_modifier: owner.scaling.rankModifier,
        day_scaling: owner.scaling.dayScaling,
        effective_scaling: owner.scaling.effectiveScaling,
        allowed_stages: [...owner.scaling.allowedStages],
        pool_size: owner.poolSize,
        species_index: owner.speciesIndex,
        variance_index: owner.varianceIndex,
      },
    };
  } else {
    // Compatibility path for deterministic fixtures that still inject resolved indexes.
    resolved = resolveGeneralTypeEncounterRuntime({
      day,
      requiredType,
      enemyRank,
      extraModifier,
      speciesIndex,
      varianceIndex,
      useVariance: true,
    });
  }

  const speciesMaster = SAFARI_GENERAL_SPECIES_MASTERS[resolved.species_id];
  if (!speciesMaster) throw new RangeError(`missing Safari General species master: ${resolved.species_id}`);
  const moveIds = safariCanonicalResetMoves(resolved.species_id, resolved.level);
  return {
    required_type: resolved.required_type,
    species_id: resolved.species_id,
    species_name: speciesMaster.name,
    base_level: resolved.base_level,
    move_ids: moveIds,
    variance: resolved.variance,
    min_level: resolved.min_level,
    max_level: resolved.max_level,
    resolved_level: resolved.level,
    selection: resolved.selection,
  };
}

export function safariGeneralEncounterCoverage() {
  const seen = new Set();
  for (const type of SAFARI_GENERAL_TYPES) {
    for (const band of projectGeneralEncounterRules().stageBands) {
      for (const id of buildGeneralEncounterSpeciesPool(type, band.stages)) seen.add(id);
    }
  }
  return Object.freeze({ types: SAFARI_GENERAL_TYPES.length, species: seen.size });
}
