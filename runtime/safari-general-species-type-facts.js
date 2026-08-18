import { projectGeneralEncounterSpeciesPools } from "./general-encounter-species-pools.js";
import { CANONICAL_BATTLE_TYPE_IDS_V108 } from "./canonical-type-effectiveness-v108.js";

const TYPE_IDS = CANONICAL_BATTLE_TYPE_IDS_V108;
const POOLS = projectGeneralEncounterSpeciesPools();
const speciesIds = Object.freeze([...new Set(Object.values(POOLS).flatMap((byStage) => Object.values(byStage).flat()))].sort());
const typeMembership = new Map(TYPE_IDS.map((type) => [type, new Set(Object.values(POOLS[type] ?? {}).flat())]));
const cache = new Map();

// The currently supported Pokemon.new creation-form owner has one type-changing
// family: Wormadam's Sandy/Trash Cloaks. Keep these canonical PBS form facts at
// the species/form projection boundary rather than in Battle damage code.
const CREATION_FORM_TYPE_OVERRIDES = Object.freeze({
  "WORMADAM,1": Object.freeze(["BUG", "GROUND"]),
  "WORMADAM,2": Object.freeze(["BUG", "STEEL"]),
});

if (speciesIds.length !== 875) throw new Error(`Safari GENERAL type coverage mismatch: ${speciesIds.length}/875`);
for (const id of speciesIds) {
  const count = TYPE_IDS.reduce((sum, type) => sum + (typeMembership.get(type).has(id) ? 1 : 0), 0);
  if (count < 1 || count > 2) throw new Error(`Safari GENERAL species type cardinality mismatch for ${id}: ${count}`);
}

export function safariGeneralSpeciesTypesV108(speciesId) {
  const id = String(speciesId ?? "");
  if (!speciesIds.includes(id)) throw new RangeError(`unknown Safari GENERAL species type fact: ${id}`);
  if (!cache.has(id)) {
    const types = TYPE_IDS.filter((type) => typeMembership.get(type).has(id));
    cache.set(id, Object.freeze(types));
  }
  return cache.get(id);
}

export function safariGeneralPokemonTypesV108(pokemon) {
  const species = String(pokemon?.species ?? "");
  const form = Math.max(0, Math.trunc(Number(pokemon?.form ?? 0)));
  const override = CREATION_FORM_TYPE_OVERRIDES[`${species},${form}`];
  return override ?? safariGeneralSpeciesTypesV108(species);
}

export function safariGeneralMaterializedSpeciesTypeCountV108() {
  return cache.size;
}

export const SAFARI_GENERAL_SPECIES_TYPE_METADATA_V108 = Object.freeze({
  speciesCount: speciesIds.length,
  typeCount: TYPE_IDS.length,
  creationFormOverrideCount: Object.keys(CREATION_FORM_TYPE_OVERRIDES).length,
  canonicalFilteredCoreSha256: "e35eecadc21535e57a4cd9946abfea9a52ed9268b12456e2934e0ef7eeabb1ab",
});
