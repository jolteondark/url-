import { add as addBagItem } from "./bag-economy-mart-flow.js";
import { ensureMaplessRunLifecycleState } from "./mapless-run-end-lifecycle.js";
import { deleteStoredPokemon, pokemonEgg } from "./party-storage-management.js";
import { storeCaughtInBoxes } from "./party-storage-handoff.js";
import {
  createPokemonRuntime,
  pokemonMoveTotalPp,
  recalculatePokemonStats,
} from "./pokemon-runtime.js";
import { safariCanonicalSpeciesCategory } from "./safari-carryover-category-projection.js";
import { ensureSafariGeneralData } from "./safari-general-data-demand.js";
import {
  SAFARI_MOVE_MASTERS,
  SAFARI_NATURE_MASTERS,
  SAFARI_SPECIES_MASTERS,
} from "./safari-playable-data.js";
import {
  createSafariPlayableRuntime,
  SAFARI_PLAYABLE_STARTING_MONEY,
} from "./safari-web-startup.js";

const ZERO_STATS = Object.freeze({ HP: 0, ATTACK: 0, DEFENSE: 0, SPECIAL_ATTACK: 0, SPECIAL_DEFENSE: 0, SPEED: 0 });
const PSEUDO_FINALS = new Set(["DRAGONITE", "TYRANITAR", "SALAMENCE", "METAGROSS", "GARCHOMP", "HYDREIGON", "GOODRA", "KOMMOO", "DRAGAPULT", "BAXCALIBUR"]);
const LEGEND_CATEGORIES = new Set(["LEGENDARY", "MYTHICAL"]);
const SPECIAL_CATEGORIES = new Set(["SUB_LEGENDARY", "ULTRA_BEAST", "PARADOX"]);

// Exact source-v0.9.108 MaplessCarryover::CLASS_RULES. Public Safari's
// SAFARI_PLAYABLE_STARTING_MONEY remains the existing base-start-money owner.
const CLASS_RULES = Object.freeze({
  general: Object.freeze({ partyLimit: 6, money: 1, supplies: Object.freeze([["POKEBALL", 5], ["POTION", 3]]) }),
  pseudo_final: Object.freeze({ partyLimit: 6, money: 0.5, supplies: Object.freeze([]) }),
  special: Object.freeze({ partyLimit: 5, money: 0.25, supplies: Object.freeze([["POKEBALL", 1], ["POTION", 1]]) }),
  legend: Object.freeze({ partyLimit: 5, money: 0, supplies: Object.freeze([]) }),
});

function clone(value) { return structuredClone(value); }
function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

export function classifySafariCarryover(pokemon) {
  if (!pokemon || pokemonEgg(pokemon)) return null;
  const species = String(pokemon.species ?? "").toUpperCase();
  if (!species) return null;
  const category = safariCanonicalSpeciesCategory(species);
  if (category === "ENEMY_ONLY") return null;
  if (LEGEND_CATEGORIES.has(category)) return "legend";
  if (SPECIAL_CATEGORIES.has(category)) return "special";
  if (PSEUDO_FINALS.has(species)) return "pseudo_final";
  return "general";
}

export function safariCarryoverPartyLimit(carryClass) {
  return CLASS_RULES[carryClass]?.partyLimit ?? CLASS_RULES.general.partyLimit;
}

async function normalizeCarriedPokemon(source) {
  const needsGeneralMasters = !SAFARI_SPECIES_MASTERS[source?.species]
    || (source?.moves ?? []).some((move) => !SAFARI_MOVE_MASTERS[typeof move === "string" ? move : move?.id]);
  if (needsGeneralMasters) await ensureSafariGeneralData();

  const original = clone(source);
  for (const key of Object.keys(original)) {
    if (key.startsWith("mapless_") && !["mapless_bonus_stats", "mapless_applied_bonus_stats"].includes(key)) delete original[key];
  }
  original.level = 5;
  original.ev = clone(ZERO_STATS);
  original.mapless_bonus_stats = clone(ZERO_STATS);
  original.mapless_applied_bonus_stats = {};
  original.item = null;
  original.status = "NONE";
  original.status_count = 0;

  const speciesMaster = SAFARI_SPECIES_MASTERS[original.species];
  if (!speciesMaster?.base_stats) throw new Error(`carryover species master unavailable: ${original.species}`);
  const natureId = original.nature_id ?? "HARDY";
  const natureMaster = SAFARI_NATURE_MASTERS[natureId];
  if (!natureMaster) throw new Error(`carryover nature master unavailable: ${natureId}`);

  let normalized = createPokemonRuntime(original);
  normalized = recalculatePokemonStats(normalized, {
    base_stats: speciesMaster.base_stats,
    nature_stat_changes: natureMaster.stat_changes ?? [],
    previous_mapless_bonus_stats: clone(ZERO_STATS),
  });
  const moves = normalized.moves.slice(0, 4).map((move) => {
    const master = SAFARI_MOVE_MASTERS[move.id];
    if (!master) throw new Error(`carryover move master unavailable: ${move.id}`);
    return { ...move, pp: pokemonMoveTotalPp(master.total_pp, Number(move.ppup ?? 0)) };
  });
  normalized = createPokemonRuntime({ ...normalized, moves, hp: normalized.max_hp, status: "NONE", status_count: 0, item: null, mapless_bonus_stats: clone(ZERO_STATS) });
  return normalized;
}

function archiveExistingParty(runtime) {
  let boxes = clone(runtime.storage_system?.boxes ?? []);
  let currentBox = Number.isInteger(runtime.storage_system?.currentBox) ? runtime.storage_system.currentBox : 0;
  const operations = [];
  for (let index = 0; index < (runtime.player?.party ?? []).length; index += 1) {
    const pokemon = runtime.player.party[index];
    if (!pokemon) continue;
    const stored = storeCaughtInBoxes({ party: [], boxes, currentBox }, pokemon, { healStoredPokemon: false });
    if (stored.storedBox < 0) throw new Error("carryover party archival has no storage capacity");
    boxes = stored.state.boxes;
    currentBox = stored.state.currentBox;
    operations.push({ op: "archive_carryover_party_pokemon", partyIndex: index, box: stored.storedBox, slot: stored.storedSlot });
  }
  return { boxes, currentBox, operations };
}

function applyClassRules(runtime, carryClass) {
  const rule = CLASS_RULES[carryClass];
  if (!rule) throw new Error(`unsupported carry class: ${carryClass}`);
  runtime.bag ??= { slots: [], money: 0 };
  runtime.bag.slots = [];
  const supplies = rule.supplies;
  const maxSlots = Math.max(1, supplies.length);
  const maxPerSlot = Math.max(1, ...supplies.map(([, quantity]) => Number(quantity)));
  for (const [item, quantity] of supplies) {
    if (!addBagItem(runtime.bag.slots, maxSlots, maxPerSlot, item, quantity)) throw new Error(`failed to add carryover supply: ${item}`);
  }
  runtime.bag.money = Math.floor(SAFARI_PLAYABLE_STARTING_MONEY * rule.money);
  return rule;
}

function applyFreshRunBoard(runtime, fresh) {
  const state = stateOf(runtime);
  const source = stateOf(fresh);
  for (const key of ["day", "board_day", "board_events", "board_revealed", "board_consumed", "board_visited", "scout_results", "sense_results", "mapless_board_format_version", "village", "notice"]) {
    if (Object.prototype.hasOwnProperty.call(source, key)) state[key] = clone(source[key]);
    else delete state[key];
  }
  state.battle = null;
  state.shop = null;
  state.location = "day_board";
}

export async function prepareSafariNextRun(runtime, selection = null) {
  const state = ensureMaplessRunLifecycleState(runtime);
  if (!state.mapless_carryover_pending || state.location !== "home") {
    return { result: "not_pending", operations: [] };
  }
  runtime.player ??= { party: [] };
  runtime.storage_system ??= { boxes: [{ name: "Box 1", capacity: 30, slots: [] }], currentBox: 0 };

  const archived = archiveExistingParty(runtime);
  const stagedStorage = { boxes: archived.boxes, currentBox: archived.currentBox };
  let keeper;
  let carryClass;
  const operations = [...archived.operations];

  if (selection && Number.isInteger(selection.boxIndex) && Number.isInteger(selection.slotIndex)) {
    const candidate = stagedStorage.boxes?.[selection.boxIndex]?.slots?.[selection.slotIndex] ?? null;
    carryClass = classifySafariCarryover(candidate);
    if (!carryClass) return { result: "ineligible", operations: [] };
    // Normalize the clone first. Storage deletion is committed only after this succeeds.
    keeper = await normalizeCarriedPokemon(candidate);
    const deleted = deleteStoredPokemon(stagedStorage, selection.boxIndex, selection.slotIndex);
    stagedStorage.boxes = deleted.state.boxes;
    stagedStorage.currentBox = deleted.state.currentBox;
    operations.push(...deleted.operations, { op: "choose_carryover", carryClass, box: selection.boxIndex, slot: selection.slotIndex });
  } else {
    // Canonical fallback exists only when the player explicitly starts the next run
    // without a boxed selection. Pending home itself never gets a temporary starter.
    const freshStarter = createSafariPlayableRuntime().player.party[0];
    carryClass = "general";
    keeper = await normalizeCarriedPokemon(freshStarter);
    operations.push({ op: "fallback_carryover_starter", carryClass });
  }

  const fresh = createSafariPlayableRuntime();
  runtime.storage_system.boxes = stagedStorage.boxes;
  runtime.storage_system.currentBox = stagedStorage.currentBox;
  runtime.player.party = [keeper];
  applyFreshRunBoard(runtime, fresh);
  const rule = applyClassRules(runtime, carryClass);

  state.mapless_carry_class = carryClass;
  state.mapless_run_active = true;
  state.mapless_run_prepared = true;
  state.mapless_run_end_pending = false;
  state.mapless_carryover_pending = false;
  state.mapless_carryover_overflow = false;
  operations.push(
    { op: "set_carry_class", value: carryClass, partyLimit: rule.partyLimit },
    { op: "set_run_active", value: true },
    { op: "set_run_prepared", value: true },
    { op: "set_carryover_pending", value: false },
    { op: "request_save", reason: "mapless_prepare_run" },
  );
  return { result: "prepared", carryClass, partyLimit: rule.partyLimit, operations };
}
