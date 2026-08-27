import { RubyMT19937Random } from "./ruby-mt19937-random.js";
import { resolveWoundedPokemon, WOUNDED_HEALING_ITEM_IDS } from "./mapless-wounded-pokemon-flow.js";
import { resolveWoundedTreatmentRuntime } from "./wounded-treatment-runtime-integration.js";
import { prepareWoundedPokemonSnapshot, scaledWoundedNormalLevel } from "./wounded-pokemon-preparation-runtime.js";
import { safariWoundedGeneralSpeciesPoolV108 } from "./safari-wounded-general-species-pool-v108.js";
import { createResolvedWoundedPokemonIndividualV108 } from "./wounded-pokemon-resolved-individual.js";
import { resolvePokemonRuntimeMasters } from "./pokemon-runtime-masters.js";
import { POKEMON_NATURE_MASTERS_V108 } from "./pokemon-nature-masters-v108.js";
import { resolvePokemonNewCreationFormSpeciesMasterV108 } from "./pokemon-new-creation-form-v108.js";
import { SAFARI_MOVE_MASTERS, SAFARI_SPECIES_MASTERS } from "./safari-playable-data.js";
import { borrowSafariSharedRunRandomInt, ensureSafariEncounterSeed } from "./safari-encounter-randomization.js";

const ZERO_STATS = Object.freeze({ HP:0, ATTACK:0, DEFENSE:0, SPECIAL_ATTACK:0, SPECIAL_DEFENSE:0, SPEED:0 });

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function requireWoundedEvent(runtime, index) {
  const state = stateOf(runtime);
  if (!Number.isInteger(index) || index < 0 || index >= (state.board_events?.length ?? 0)) throw new RangeError("board index must be 0..7");
  const event = state.board_events[index];
  if (!event || event.kind !== "normal_event" || event.normal_event_id !== "wounded_pokemon") throw new Error("wounded_pokemon board event is required");
  return { state, event };
}

function explicitCreationFormContext(input) {
  if (input == null) return undefined;
  if (typeof input !== "object" || Array.isArray(input)) throw new TypeError("creationFormContext must be an object");
  return { ...input };
}

function materializePreparedWoundedPokemon(event) {
  const data = event?.normal_data;
  const fixed = data?.pokemon_data;
  if (!data?.species || !fixed) throw new Error("prepared wounded Pokemon data is required");
  const baseMaster = SAFARI_SPECIES_MASTERS[data.species];
  if (!baseMaster) throw new RangeError(`species is outside the canonical GENERAL pool: ${data.species}`);
  const form = Number.isInteger(Number(fixed.form)) ? Math.max(0, Number(fixed.form)) : 0;
  const speciesMaster = resolvePokemonNewCreationFormSpeciesMasterV108(baseMaster, form);
  const natureId = String(fixed.nature ?? "");
  const natureMaster = POKEMON_NATURE_MASTERS_V108[natureId];
  if (!natureMaster) throw new RangeError(`unknown wounded Pokemon nature: ${natureId}`);
  const runtime = resolvePokemonRuntimeMasters({
    species: data.species,
    level: Number(data.level),
    form,
    personal_id: Number(fixed.personal_id ?? data.personal_id),
    ability_index: Number(fixed.ability_index ?? 0),
    gender: fixed.gender,
    nature_id: natureId,
    iv: structuredClone(fixed.iv ?? {}),
    ev: { ...ZERO_STATS },
    moves: [...(fixed.moves ?? [])],
    hp: 1,
    status: "NONE",
    item: null,
    mapless_bonus_stats: { ...ZERO_STATS },
  }, {
    species_master: speciesMaster,
    nature_master: natureMaster,
    move_masters: SAFARI_MOVE_MASTERS,
  });
  return { ...runtime, hp: 1, item: null, held_item: null };
}

function canonicalLocalPreparation(event, day, randomInt, creationFormContext) {
  const seed = Number.parseInt(event.normal_seed ?? event.normal_data?.normal_seed, 10);
  if (!Number.isInteger(seed)) throw new TypeError("normal_seed is required");
  const rng = new RubyMT19937Random(seed >>> 0);
  const pool = safariWoundedGeneralSpeciesPoolV108();
  const current = { ...event, normal_data: { ...(event.normal_data ?? {}) } };
  const data = current.normal_data;
  if (!data.species) data.species = pool[rng.randInt(pool.length)];
  if (!data.level) data.level = scaledWoundedNormalLevel(day);
  if (!data.pokemon_data) {
    const finalPersonalId = rng.randInt(0x100000000);
    const resolvedPokemon = createResolvedWoundedPokemonIndividualV108({
      species: data.species,
      level: data.level,
      finalPersonalId,
      randomInt,
      creationFormContext,
    });
    data.normal_seed = seed >>> 0;
    const prepared = prepareWoundedPokemonSnapshot({
      event: current,
      day,
      normalSeed: seed >>> 0,
      resolvedPokemon,
      validGeneralSpeciesPool: pool,
    });
    prepared.event.normal_data.pokemon_data.form = Number(resolvedPokemon.form ?? 0);
    return {
      event: prepared.event,
      pokemon: materializePreparedWoundedPokemon(prepared.event),
      species: prepared.species,
      level: prepared.level,
    };
  }
  return { event: current, pokemon: materializePreparedWoundedPokemon(current), species: data.species, level: data.level };
}

export function safariWoundedHealingInventory(runtime) {
  const totals = new Map();
  for (const slot of runtime?.bag?.slots ?? []) {
    if (!slot || !WOUNDED_HEALING_ITEM_IDS.includes(String(slot[0]))) continue;
    const quantity = Number(slot[1]);
    if (!Number.isInteger(quantity) || quantity <= 0) continue;
    totals.set(String(slot[0]), (totals.get(String(slot[0])) ?? 0) + quantity);
  }
  return WOUNDED_HEALING_ITEM_IDS.filter((itemId) => totals.has(itemId)).map((itemId) => ({ itemId, quantity: totals.get(itemId) }));
}

export function prepareSafariWoundedPokemonCandidate(runtime, index, options = {}) {
  const { state, event } = requireWoundedEvent(runtime, index);
  const day = Math.max(1, Math.trunc(Number(state.day) || 1));
  let sharedCounter = null;
  let randomInt = options.randomInt;
  if (typeof randomInt !== "function" && !event.normal_data?.pokemon_data) {
    ensureSafariEncounterSeed(state);
    sharedCounter = Number(state.preview_encounter_counter ?? 0);
    randomInt = (limit) => borrowSafariSharedRunRandomInt(runtime, limit);
  }
  try {
    const prepared = canonicalLocalPreparation(
      event,
      day,
      typeof randomInt === "function" ? randomInt : (() => { throw new Error("wounded Pokemon shared RNG owner is unavailable"); }),
      explicitCreationFormContext(options.creationFormContext),
    );
    state.board_events[index] = prepared.event;
    state.board_revealed[index] = true;
    state.notice = `傷ついた${prepared.species} Lv.${prepared.level}がいます。`;
    return { runtime, result: event.normal_data?.pokemon_data ? "already_prepared" : "prepared", ...prepared };
  } catch (error) {
    if (sharedCounter !== null) state.preview_encounter_counter = sharedCounter;
    throw error;
  }
}

function commitResolution(runtime, index, resolved, extraOperations = []) {
  const { state } = requireWoundedEvent(runtime, index);
  state.board_events[index] = resolved.event;
  state.board_revealed[index] = true;
  if (resolved.event?.normal_resolved) state.board_consumed[index] = true;
  const operations = [...(resolved.operations ?? []), ...extraOperations];
  state.last_operations = operations;
  return operations;
}

export function resolveSafariWoundedPokemonDecision(runtime, index, input = {}) {
  const prepared = prepareSafariWoundedPokemonCandidate(runtime, index, input);
  const { state, event } = requireWoundedEvent(runtime, index);
  const party = Array.isArray(runtime.player?.party) ? runtime.player.party : [];

  if (party.filter(Boolean).length >= 6 || input.choice !== "treat") {
    const resolved = resolveWoundedPokemon({
      event,
      party,
      species_exists: true,
      choice: input.choice === "treat" ? "treat" : "leave",
      healing_entries: [],
    });
    const save = resolved.event?.normal_resolved ? [{ op: "request_save", reason: "wounded_pokemon_resolved" }] : [];
    const operations = commitResolution(runtime, index, resolved, save);
    state.notice = resolved.operations.find((operation) => operation.op === "leave_event")?.message
      ?? (resolved.outcome === "no_healing_item" ? "回復に使える道具がありません。" : "傷ついたポケモンのイベントを終了しました。");
    return { runtime, result: resolved.outcome, outcome: resolved.outcome, operations, notice: state.notice, persistenceRequested: save.length > 0 };
  }

  const pokemon = input.pokemon ?? prepared.pokemon;
  const itemId = String(input.itemId ?? "").toUpperCase();
  const resolved = resolveWoundedTreatmentRuntime({
    event,
    slots: runtime.bag?.slots ?? [],
    party,
    speciesExists: true,
    choice: "treat",
    itemId,
    pokemon,
    consumedAfterUse: true,
  });
  if (resolved.outcome === "joined" && resolved.joinedPokemon) {
    runtime.bag.slots = resolved.slots;
    runtime.player.party = [...party, resolved.joinedPokemon];
  }
  const save = resolved.event?.normal_resolved ? [{ op: "request_save", reason: "wounded_pokemon_resolved" }] : [];
  const operations = commitResolution(runtime, index, resolved, save);
  state.notice = resolved.outcome === "joined"
    ? `${resolved.joinedPokemon.species}を手持ちに加えました。`
    : resolved.outcome === "no_healing_item" ? "回復に使える道具がありません。"
      : resolved.outcome === "item_not_selected" ? "使う回復アイテムを選んでください。"
        : resolved.outcome === "healing_failed" ? `${itemId || "その道具"}では治療できませんでした。`
          : `治療できませんでした（${resolved.outcome}）。`;
  return {
    runtime,
    result: resolved.outcome,
    outcome: resolved.outcome,
    joinedPokemon: resolved.joinedPokemon ?? null,
    itemRemoved: resolved.itemRemoved === true,
    operations,
    notice: state.notice,
    persistenceRequested: save.length > 0,
  };
}
