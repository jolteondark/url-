import { MAPLESS_DELTA_EXCHANGE_SPECIES_CHUNK_V108 as DELTA_CHUNK_0 } from "./generated/mapless-delta-exchange-species-v108-0.js";
import { MAPLESS_DELTA_EXCHANGE_SPECIES_CHUNK_V108 as DELTA_CHUNK_1 } from "./generated/mapless-delta-exchange-species-v108-1.js";
import { MAPLESS_DELTA_EXCHANGE_SPECIES_CHUNK_V108 as DELTA_CHUNK_2 } from "./generated/mapless-delta-exchange-species-v108-2.js";
import { MAPLESS_DELTA_EXCHANGE_SPECIES_CHUNK_V108 as DELTA_CHUNK_3 } from "./generated/mapless-delta-exchange-species-v108-3.js";
import { MAPLESS_DELTA_EXCHANGE_ABILITIES_V108 } from "./generated/mapless-delta-exchange-abilities-v108.js";
import { installMaplessDeltaExchangeMoveMastersV108 } from "./generated/mapless-delta-exchange-moves-v108.js";
import { maplessEggShopBaseLevelForDayV108 } from "./mapless-egg-shop-v108-flow.js";
import { SAFARI_MOVE_MASTERS, SAFARI_SPECIES_MASTERS } from "./safari-playable-data.js";

export const MAPLESS_DELTA_EXCHANGE_TYPE_IDS_V108 = Object.freeze([
  "BUG","DARK","DRAGON","ELECTRIC","FAIRY","FIGHTING","FIRE","FLYING","GHOST",
  "GRASS","GROUND","ICE","NORMAL","POISON","PSYCHIC","ROCK","STEEL","WATER",
]);

export const MAPLESS_DELTA_EXCHANGE_SPECIES_MASTERS_V108 = Object.freeze({
  ...DELTA_CHUNK_0,
  ...DELTA_CHUNK_1,
  ...DELTA_CHUNK_2,
  ...DELTA_CHUNK_3,
});

const EARLY_STAGES = new Set(["NO_EVOLUTION","ONE_EVOLUTION_BASE","TWO_EVOLUTION_BASE"]);

export function maplessDeltaExchangeProjectionSupportsDayV108(day) {
  // The current generated projection contains every CUSTOM Delta species that
  // canonical General Encounter staging can select while NORMAL base level is
  // below 16. In v0.9.108 that covers DAY1 through DAY35. Later bands fail
  // closed until their middle/final Delta masters are projected as well.
  return maplessEggShopBaseLevelForDayV108(day) < 16;
}

export function maplessDeltaExchangePoolForDayV108(day) {
  if (!maplessDeltaExchangeProjectionSupportsDayV108(day)) return [];
  return Object.values(MAPLESS_DELTA_EXCHANGE_SPECIES_MASTERS_V108)
    .filter((master) => EARLY_STAGES.has(master.evolution_stage))
    .sort((left, right) => Number(left.dex_number) - Number(right.dex_number))
    .map((master) => master.id);
}

function randomIntFallback(limit) {
  const max = Number(limit);
  if (!Number.isSafeInteger(max) || max <= 0 || max > 0x100000000) throw new RangeError("random limit must be 1..2^32");
  if (globalThis.crypto?.getRandomValues) {
    const span = 0x100000000;
    const threshold = span - (span % max);
    const word = new Uint32Array(1);
    do globalThis.crypto.getRandomValues(word); while (word[0] >= threshold);
    return word[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function draw(randomInt, limit, label) {
  const value = Number(randomInt(limit));
  if (!Number.isInteger(value) || value < 0 || value >= limit) throw new RangeError(`${label} randomInt(${limit}) returned ${value}`);
  return value;
}

export function hydrateMaplessDeltaExchangeEventV108(event, day, { randomInt = randomIntFallback } = {}) {
  if (!event || typeof event !== "object" || event.kind !== "delta_exchange") return event;
  const normalizedDay = Math.max(1, Math.trunc(Number(day) || 1));
  if (!MAPLESS_DELTA_EXCHANGE_TYPE_IDS_V108.includes(event.type)) {
    event.type = MAPLESS_DELTA_EXCHANGE_TYPE_IDS_V108[draw(randomInt, MAPLESS_DELTA_EXCHANGE_TYPE_IDS_V108.length, "delta type")];
  }
  if (event.delta_species && MAPLESS_DELTA_EXCHANGE_SPECIES_MASTERS_V108[event.delta_species]) return event;
  const pool = maplessDeltaExchangePoolForDayV108(normalizedDay);
  if (!pool.length) {
    event.delta_species = null;
    event.delta_projection_unsupported = true;
    return event;
  }
  event.delta_species = pool[draw(randomInt, pool.length, "delta species")];
  delete event.delta_projection_unsupported;
  return event;
}

export function hydrateSafariDeltaExchangeCells(runtime, { randomInt = randomIntFallback } = {}) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || !Array.isArray(state.board_events)) return runtime;
  for (const event of state.board_events) hydrateMaplessDeltaExchangeEventV108(event, state.day, { randomInt });
  return runtime;
}

export function installMaplessDeltaExchangeMastersV108(speciesId) {
  const id = String(speciesId ?? "");
  const master = MAPLESS_DELTA_EXCHANGE_SPECIES_MASTERS_V108[id];
  if (!master) return null;
  SAFARI_SPECIES_MASTERS[id] = master;
  installMaplessDeltaExchangeMoveMastersV108(SAFARI_MOVE_MASTERS);
  return master;
}

export function maplessDeltaExchangeAbilityForIndividualV108(speciesId, abilityIndex) {
  const abilities = MAPLESS_DELTA_EXCHANGE_ABILITIES_V108[String(speciesId ?? "")] ?? [];
  if (!abilities.length) return null;
  const index = Math.max(0, Math.trunc(Number(abilityIndex) || 0));
  return abilities[index] ?? abilities[0] ?? null;
}

export function maplessDeltaExchangeSpeciesMasterV108(speciesId) {
  return MAPLESS_DELTA_EXCHANGE_SPECIES_MASTERS_V108[String(speciesId ?? "")] ?? null;
}
