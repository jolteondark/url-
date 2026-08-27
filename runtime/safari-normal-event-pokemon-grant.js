import { routeCaughtQueueToPartyStorage } from "./caught-queue-party-storage.js";
import { buildGeneralEncounterSpeciesPool } from "./general-encounter-species-pools.js";
import { createMaplessEggShopEggV108 } from "./mapless-egg-shop-v108-flow.js";
import { safariCarryoverPartyLimit } from "./mapless-carry-class-rules.js";
import { resolvePokemonRuntimeMasters } from "./pokemon-runtime-masters.js";
import { updatePokemonRuntime } from "./pokemon-runtime.js";
import { RubyMT19937Random } from "./ruby-mt19937-random.js";
import { ensureSafariGeneralCombatData, safariGeneralCombatModules } from "./safari-general-data-demand.js";
import {
  SAFARI_MOVE_MASTERS,
  SAFARI_NATURE_MASTERS,
  SAFARI_SPECIES_MASTERS,
  SAFARI_ZERO_STAT_VALUES,
  safariCanonicalResetMoves,
} from "./safari-playable-data.js";

const EGG_STAGES = Object.freeze(["NO_EVOLUTION", "ONE_EVOLUTION_BASE", "TWO_EVOLUTION_BASE"]);

function maplessState(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function normalizedSeed(value) { return Number(value) & 0x7fffffff; }
function unit32(rng) { return rng.randInt(0x100000000) / 0x100000000; }

function routeOne(runtime, pokemon) {
  const state = maplessState(runtime);
  const carryClass = state.mapless_carry_class ?? "general";
  const partyLimit = safariCarryoverPartyLimit(carryClass);
  const routed = routeCaughtQueueToPartyStorage({
    party:runtime.player.party,
    boxes:runtime.storage_system.boxes,
    currentBox:runtime.storage_system.currentBox,
  }, [pokemon], { maxPartySize:partyLimit });
  if (routed.remainingQueue.length > 0) {
    return { runtime, success:false, result:"full", pokemon, routed, operations:routed.operations };
  }
  runtime.player.party = routed.state.party;
  runtime.storage_system.boxes = routed.state.boxes;
  runtime.storage_system.currentBox = routed.state.currentBox;
  return { runtime, success:true, result:routed.routed[0]?.result ?? "stored", pokemon, routed, operations:routed.operations };
}

function materializePreparedEncounterPokemon(encounter) {
  if (!encounter || typeof encounter !== "object" || Array.isArray(encounter)) {
    throw new TypeError("prepared normal-event encounter is required");
  }
  const species = String(encounter.species ?? encounter.species_id ?? "");
  const speciesMaster = SAFARI_SPECIES_MASTERS[species];
  if (!speciesMaster) throw new RangeError(`prepared normal-event encounter species is outside Safari projection: ${species}`);
  const level = Number(encounter.level ?? encounter.resolved_level);
  if (!Number.isInteger(level) || level < 1) throw new RangeError("prepared normal-event encounter level is unresolved");
  const natureId = String(encounter.nature_id ?? "HARDY");
  const natureMaster = SAFARI_NATURE_MASTERS[natureId] ?? SAFARI_NATURE_MASTERS.HARDY;
  let pokemon = resolvePokemonRuntimeMasters({
    species,
    level,
    form:Number(encounter.form ?? 0),
    gender:encounter.gender ?? null,
    shiny:Boolean(encounter.shiny),
    status:"NONE",
    hp:1,
    nature_id:natureMaster?.id ?? natureId,
    iv:encounter.iv ? structuredClone(encounter.iv) : { ...SAFARI_ZERO_STAT_VALUES },
    ev:encounter.ev ? structuredClone(encounter.ev) : { ...SAFARI_ZERO_STAT_VALUES },
    moves:Array.isArray(encounter.moves) && encounter.moves.length > 0
      ? structuredClone(encounter.moves)
      : safariCanonicalResetMoves(species, level),
  }, {
    species_master:speciesMaster,
    nature_master:natureMaster,
    move_masters:SAFARI_MOVE_MASTERS,
  });
  pokemon = updatePokemonRuntime(pokemon, { hp:pokemon.max_hp });
  return pokemon;
}

export async function materializeNormalEventEncounterPokemon(runtime, { type, modifier = 0, seed } = {}) {
  const requiredType = String(type ?? "");
  if (!requiredType) throw new TypeError("normal-event encounter type is required");
  await ensureSafariGeneralCombatData("wild");
  const rng = new RubyMT19937Random(normalizedSeed(seed) ^ 0x4e455650);
  const generated = safariGeneralCombatModules("wild").encounterRuntime.resolveSafariGeneralEncounter({
    day:maplessState(runtime).day,
    requiredType,
    enemyRank:"NORMAL",
    extraModifier:Number(modifier) || 0,
    speciesRoll:unit32(rng),
    varianceRoll:unit32(rng),
  });
  const species = String(generated.species_id ?? "");
  const speciesMaster = SAFARI_SPECIES_MASTERS[species];
  if (!speciesMaster) throw new RangeError(`normal-event encounter species is outside Safari projection: ${species}`);
  const level = Number(generated.resolved_level);
  if (!Number.isInteger(level) || level < 1) throw new RangeError("normal-event encounter level is unresolved");
  const natureId = "HARDY";
  let pokemon = resolvePokemonRuntimeMasters({
    species,
    level,
    status:"NONE",
    hp:1,
    nature_id:natureId,
    iv:{ ...SAFARI_ZERO_STAT_VALUES },
    ev:{ ...SAFARI_ZERO_STAT_VALUES },
    moves:safariCanonicalResetMoves(species, level),
  }, {
    species_master:speciesMaster,
    nature_master:SAFARI_NATURE_MASTERS[natureId],
    move_masters:SAFARI_MOVE_MASTERS,
  });
  pokemon = updatePokemonRuntime(pokemon, { hp:pokemon.max_hp });
  return pokemon;
}

export function materializeNormalEventHiddenEgg(runtime, { type, seed } = {}) {
  const requiredType = String(type ?? "");
  if (!requiredType) throw new TypeError("normal-event hidden egg type is required");
  const pool = buildGeneralEncounterSpeciesPool(requiredType, EGG_STAGES).filter((species) => Boolean(SAFARI_SPECIES_MASTERS[species]));
  if (pool.length === 0) throw new Error(`normal-event hidden egg has no canonical base-stage pool for ${requiredType}`);
  const rng = new RubyMT19937Random(normalizedSeed(seed) ^ 0x45474731);
  const species = pool[rng.randInt(pool.length)];
  const created = createMaplessEggShopEggV108({
    species,
    day:maplessState(runtime).day,
    speciesMaster:SAFARI_SPECIES_MASTERS[species],
    moveMasters:SAFARI_MOVE_MASTERS,
    randomInt:(limit) => rng.randInt(limit),
    finalPersonalId:rng.randInt(0x100000000),
  });
  const egg = structuredClone(created.egg);
  delete egg.mapless_egg_shop_bonus_pending;
  delete egg.mapless_egg_shop_day;
  delete egg.obtain_text;
  return egg;
}

export async function grantNormalEventPokemonFromEncounter(runtime, request = {}) {
  const pokemon = await materializeNormalEventEncounterPokemon(runtime, request);
  return routeOne(runtime, pokemon);
}

export function grantNormalEventPokemonFromPreparedEncounter(runtime, encounter) {
  return routeOne(runtime, materializePreparedEncounterPokemon(encounter));
}

export function grantNormalEventHiddenEgg(runtime, request = {}) {
  const egg = materializeNormalEventHiddenEgg(runtime, request);
  return routeOne(runtime, egg);
}
