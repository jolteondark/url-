import { resolveGeneralTypeEncounterRuntime } from "./general-type-encounter-runtime.js";
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
} = {}) {
  if (!SAFARI_GENERAL_TYPES.includes(requiredType)) {
    throw new RangeError(`unknown General Encounter type: ${requiredType}`);
  }
  const resolved = resolveGeneralTypeEncounterRuntime({
    day,
    requiredType,
    enemyRank,
    extraModifier,
    speciesIndex,
    varianceIndex,
    useVariance: true,
  });
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
