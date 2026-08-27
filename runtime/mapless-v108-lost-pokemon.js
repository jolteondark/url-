import { buildGeneralEncounterSpeciesPool } from "./general-encounter-species-pools.js";
import { RubyMT19937Random } from "./ruby-mt19937-random.js";
import { hasMaplessV108ItemMetadata } from "./mapless-v108-item-metadata.js";

export const MAPLESS_V108_LOST_POKEMON_RARE_BERRIES = Object.freeze([
  "LIECHIBERRY", "GANLONBERRY", "SALACBERRY", "PETAYABERRY",
  "APICOTBERRY", "LANSATBERRY", "STARFBERRY", "ENIGMABERRY",
]);

export const MAPLESS_V108_LOST_POKEMON_UNEVOLVED_STAGES = Object.freeze([
  "NO_EVOLUTION", "ONE_EVOLUTION_BASE", "TWO_EVOLUTION_BASE",
]);

function seed32(value) {
  return Number(value ?? 0) & 0x7fffffff;
}

function cloneEncounter(encounter) {
  if (!encounter || typeof encounter !== "object" || Array.isArray(encounter)) {
    throw new TypeError("base encounter must be an object");
  }
  return structuredClone(encounter);
}

export function resolveMaplessV108LostPokemonGiftRoll(seed) {
  return new RubyMT19937Random(seed32(seed) ^ 0x4c4f5354).randInt(100);
}

export function maplessV108LostPokemonUnevolvedPool(type) {
  return buildGeneralEncounterSpeciesPool(String(type ?? "").trim().toUpperCase(), MAPLESS_V108_LOST_POKEMON_UNEVOLVED_STAGES);
}

export function resolveMaplessV108LostPokemonUnevolvedSpecies(type, seed) {
  const pool = maplessV108LostPokemonUnevolvedPool(type);
  if (pool.length === 0) return null;
  return pool[new RubyMT19937Random(seed32(seed)).randInt(pool.length)];
}

export function projectMaplessV108LostPokemonEncounter(baseEncounter, { type, seed, displayProjector = null } = {}) {
  const encounter = cloneEncounter(baseEncounter);
  const species = resolveMaplessV108LostPokemonUnevolvedSpecies(type, seed);
  if (species) encounter.species = species;
  if (typeof displayProjector === "function") {
    encounter.display_sprite = displayProjector({
      species:encounter.species,
      form:encounter.form ?? 0,
      gender:encounter.gender ?? null,
      shiny:Boolean(encounter.shiny),
      encounter:structuredClone(encounter),
    });
  }
  return encounter;
}

export function hydrateMaplessV108LostPokemonFixedData(seed, normalData = {}, options = {}) {
  const data = structuredClone(normalData ?? {});
  if (data.gift_roll == null) data.gift_roll = resolveMaplessV108LostPokemonGiftRoll(seed);
  if (data.lost_encounter == null) {
    if (typeof options.createBaseEncounter !== "function") {
      throw new TypeError("createBaseEncounter is required when lost_encounter is absent");
    }
    const type = String(data.type ?? options.type ?? "").trim().toUpperCase();
    if (!type) throw new TypeError("Lost Pokemon type is required");
    const base = options.createBaseEncounter({
      type,
      enemyRank:"NORMAL",
      levelAdjustment:-4,
      seed:seed32(seed),
    });
    data.lost_encounter = projectMaplessV108LostPokemonEncounter(base, {
      type,
      seed,
      displayProjector:options.displayProjector,
    });
  }
  return data;
}

export function resolveMaplessV108LostPokemonBerryThanks(seed, giftRoll, itemExists = hasMaplessV108ItemMetadata) {
  if (Number(giftRoll) >= 20) return { kind:"shared_small", tier:"small", count:1, items:[] };
  const exists = typeof itemExists === "function" ? itemExists : hasMaplessV108ItemMetadata;
  const pool = MAPLESS_V108_LOST_POKEMON_RARE_BERRIES.filter((itemId) => exists(itemId));
  if (pool.length === 0) return { kind:"shared_small", tier:"small", count:1, items:[] };
  const rng = new RubyMT19937Random(seed32(seed) ^ 0x52415245);
  return { kind:"rare_item", items:[pool[rng.randInt(pool.length)]] };
}
