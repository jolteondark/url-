import * as base from "./safari-playable-integration-base.js";
import { resolveDayBoardCellDispatch } from "./mapless-day-board-cell-dispatch.js";
import { projectDayBoardEventName } from "./mapless-day-board-event-name-projection.js";
import { resolveBrowserMaplessWildEncounter } from "./browser-mapless-wild-encounter-runtime.js";
import { resolveBattleStartCore } from "./battle-core-start-handoff.js";
import { resolvePokemonRuntimeMasters } from "./pokemon-runtime-masters.js";
import { movePartyPokemonToLead } from "./party-order-management.js";
import { ensureSafariEncounterSeed, nextSafariEncounterSpeciesIndex } from "./safari-encounter-randomization.js";
import { safariGeneralCombatModules, safariGeneralCombatReady } from "./safari-general-data-demand.js";
import { SAFARI_MOVE_MASTERS, SAFARI_NATURE_MASTERS, SAFARI_SPECIES_MASTERS, SAFARI_ZERO_STAT_VALUES } from "./safari-playable-data.js";

export * from "./safari-playable-integration-base.js";

const SAFARI_GENERAL_TYPES = Object.freeze([
  "BUG", "DARK", "DRAGON", "ELECTRIC", "FAIRY", "FIGHTING", "FIRE", "FLYING", "GHOST",
  "GRASS", "GROUND", "ICE", "NORMAL", "POISON", "PSYCHIC", "ROCK", "STEEL", "WATER",
]);
const SAFARI_GENERAL_TYPE_NAMES = Object.freeze({
  BUG: "むし", DARK: "あく", DRAGON: "ドラゴン", ELECTRIC: "でんき",
  FAIRY: "フェアリー", FIGHTING: "かくとう", FIRE: "ほのお", FLYING: "ひこう",
  GHOST: "ゴースト", GRASS: "くさ", GROUND: "じめん", ICE: "こおり",
  NORMAL: "ノーマル", POISON: "どく", PSYCHIC: "エスパー", ROCK: "いわ",
  STEEL: "はがね", WATER: "みず",
});

function stateOf(runtime) { const state = runtime?.variables?.mapless; if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required"); return state; }
function moveId(move) { return typeof move === "string" ? move : move?.id; }
function wildTypeFor(day, ordinal) { return SAFARI_GENERAL_TYPES[((Math.max(1, Number(day)) - 1) * 2 + ordinal) % SAFARI_GENERAL_TYPES.length]; }
function assignFullWildTypes(state) { let ordinal = 0; state.board_events = state.board_events.map((event) => event.kind === "wild" ? { ...event, type: wildTypeFor(state.day, ordinal++) } : event); return state; }
function randomUint32() { if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") { const out = new Uint32Array(1); globalThis.crypto.getRandomValues(out); return out[0] >>> 0; } return Math.floor(Math.random() * 0x100000000) >>> 0; }
function randomBelow(max) { const limit = Math.floor(0x100000000 / max) * max; while (true) { const value = randomUint32(); if (value < limit) return value % max; } }
function unitFromUint32(value) { return (Number(value) >>> 0) / 0x100000000; }
function ensureTrainerSeeds(state) {
  const used = new Set();
  for (const event of state.board_events ?? []) if (event?.kind === "trainer" && Number.isInteger(event.trainer_seed) && event.trainer_seed >= 0) used.add(event.trainer_seed);
  state.board_events = (state.board_events ?? []).map((event, index) => {
    if (event?.kind !== "trainer" || (Number.isInteger(event.trainer_seed) && event.trainer_seed >= 0)) return event;
    const day = Math.max(1, Math.trunc(Number(state.day)));
    let seed = ((Math.imul(day, 1_000_003) ^ Math.imul(index + 1, 97_409) ^ randomBelow(0x7fffffff)) & 0x7fffffff) >>> 0;
    while (used.has(seed)) seed = (seed + 1) & 0x7fffffff;
    used.add(seed);
    return { ...event, trainer_seed: seed };
  });
  return state;
}
function baseTurnInput(state, index) { return { index, day: state.day, board_events: state.board_events, board_revealed: state.board_revealed, board_consumed: state.board_consumed, board_visited: state.board_visited, notice: state.notice, scene_is_self: true, scene_same: true, event_stage_active: true, pending_hatches: [] }; }
function materializePokemon(input) {
  const speciesMaster = SAFARI_SPECIES_MASTERS[input?.species]; if (!speciesMaster) throw new RangeError(`species is outside the Safari GENERAL projection: ${input?.species}`);
  const moves = (input.moves ?? input.move_ids ?? []).map(moveId); for (const id of moves) if (!SAFARI_MOVE_MASTERS[id]) throw new RangeError(`move is outside the Safari GENERAL projection: ${id}`);
  const natureId = input.nature_id ?? "HARDY";
  return resolvePokemonRuntimeMasters({ ...input, hp: input.hp ?? 1, nature_id: natureId, iv: input.iv ?? { ...SAFARI_ZERO_STAT_VALUES }, ev: input.ev ?? { ...SAFARI_ZERO_STAT_VALUES }, moves }, { species_master: speciesMaster, nature_master: SAFARI_NATURE_MASTERS[natureId], move_masters: SAFARI_MOVE_MASTERS });
}
function setBattle(runtime, index, kind, opponent, operations, trainer = null, encounterResolution = null, generated = null) {
  const state = stateOf(runtime); const battleStart = resolveBattleStartCore({ sendOuts: [[0, runtime.player.party[0]], [1, opponent]] }); const lastOperations = [...operations, ...(encounterResolution?.operations ?? []), ...battleStart.operations];
  state.battle = { kind, board_index: index, turn: 1, decision: 0, completed: false, captured: false, foe: opponent, trainer, trainer_party: trainer?.party?.map(materializePokemon) ?? null, trainer_party_index: trainer ? 0 : null, trainer_seed: trainer?.seed ?? null, prize_money: trainer?.prize_money ?? null, skill_level: trainer?.skill_level ?? null, encounter_request: encounterResolution?.request ?? null, encounter: encounterResolution?.encounter ?? null, encounter_cleanup: encounterResolution?.cleanup ?? [], general_selection: generated?.selection ?? null, last_operations: lastOperations, presentation: [{ type: "battle_started", actor: "foe", species: opponent.species, trainer: trainer?.trainer_full_name ?? null }] };
  state.last_operations = lastOperations;
}
function startWild(runtime, event, index, operations) {
  const { encounterRuntime } = safariGeneralCombatModules();
  const state = stateOf(runtime);
  const speciesRoll = unitFromUint32(nextSafariEncounterSpeciesIndex(state, { day: state.day, boardIndex: index }));
  const varianceRoll = unitFromUint32(nextSafariEncounterSpeciesIndex(state, { day: state.day, boardIndex: index }));
  const generated = encounterRuntime.resolveSafariGeneralEncounter({ day: state.day, requiredType: event.type, enemyRank: "NORMAL", extraModifier: 0, speciesRoll, varianceRoll });
  const encounterResolution = resolveBrowserMaplessWildEncounter({ day: state.day, event, boardIndex: index, generated, variance: generated.variance, minLevel: generated.min_level, maxLevel: generated.max_level, gameTempPresent: true }); const encounter = encounterResolution.encounter;
  const opponent = materializePokemon({ species: encounter.species_id, level: encounter.level, status: "NONE", moves: encounter.move_ids }); setBattle(runtime, index, "wild", opponent, operations, null, encounterResolution, generated); state.notice = `野生の${encounter.species_name}が現れた！`;
}
function startTrainer(runtime, event, index, operations) {
  const { trainerGenerator } = safariGeneralCombatModules();
  const state = stateOf(runtime); const trainer = trainerGenerator.generateSafariDynamicTrainer({ day: state.day, seed: event.trainer_seed }); const party = trainer.party.map(materializePokemon); setBattle(runtime, index, "trainer", party[0], operations, trainer); state.battle.trainer_party = party; state.notice = `${trainer.trainer_full_name}が勝負を仕掛けてきた！`;
}

export function createSafariPlayableRuntime() { const runtime = base.createSafariPlayableRuntime(); const state = stateOf(runtime); ensureSafariEncounterSeed(state); assignFullWildTypes(state); ensureTrainerSeeds(state); return runtime; }
export function boardCellPresentation(runtime, index) { const state = stateOf(runtime); if (!Number.isInteger(index) || index < 0 || index >= state.board_events.length) throw new RangeError("board index must be 0..7"); const event = state.board_events[index]; if (event.kind !== "wild") return base.boardCellPresentation(runtime, index); const revealed = Boolean(state.board_revealed[index]); return { index, kind: event.kind, label: revealed ? projectDayBoardEventName(event, SAFARI_GENERAL_TYPE_NAMES) : "？？？", revealed, consumed: Boolean(state.board_consumed[index]), disabled: Boolean(state.board_consumed[index]) }; }
function activateCombatCell(runtime, index, event) {
  const state = stateOf(runtime);
  if (!safariGeneralCombatReady()) {
    state.notice = "戦闘データを読み込んでいます…";
    return { runtime, result: "combat_data_required", boundary: event.kind, notice: state.notice, operations: [] };
  }
  const dispatch = resolveDayBoardCellDispatch({ ...baseTurnInput(state, index), reusable: false }); state.board_events = dispatch.state.board_events; state.board_revealed = dispatch.state.board_revealed; state.board_consumed = dispatch.state.board_consumed; state.last_operations = dispatch.operations; state.notice = dispatch.notice;
  if (dispatch.result === "dispatched") { if (event.kind === "wild") startWild(runtime, event, index, dispatch.operations); else startTrainer(runtime, event, index, dispatch.operations); }
  return { runtime, result: dispatch.result, boundary: event.kind, notice: state.notice, operations: state.battle?.last_operations ?? dispatch.operations, presentation: state.battle?.presentation ?? [], trainer: state.battle?.trainer ?? null };
}
export function activateSafariDayBoardCell(runtime, index) {
  const state = stateOf(runtime), event = state.board_events[index];
  if (!event || !["wild", "trainer"].includes(event.kind)) { const result = base.activateSafariDayBoardCell(runtime, index); if (result.result === "day_advanced") { const next = stateOf(runtime); assignFullWildTypes(next); ensureTrainerSeeds(next); } return result; }
  if (state.battle && !state.battle.completed) return { runtime, result: "battle_active", boundary: "battle", notice: "戦闘を先に終えてください。", operations: [] };
  if (state.shop) return { runtime, result: "shop_active", boundary: "shop", notice: "ショップを先に終了してください。", operations: [] };
  return activateCombatCell(runtime, index, event);
}
export function setSafariPartyLead(runtime, index) { const state = stateOf(runtime); if (state.battle) throw new Error("戦闘中は先頭を変更できません。"); const result = movePartyPokemonToLead(runtime.player.party, index); state.notice = result.changed ? `${result.pokemon.species}を先頭にしました。` : `${result.pokemon.species}はすでに先頭です。`; return { ...result, runtime, notice: state.notice }; }
export function loadSafariPlayableRun(storage, currentRuntime = createSafariPlayableRuntime()) { const loaded = base.loadSafariPlayableRun(storage, currentRuntime); if (loaded.found) { const state = stateOf(loaded.state); ensureSafariEncounterSeed(state); assignFullWildTypes(state); ensureTrainerSeeds(state); } return loaded; }
