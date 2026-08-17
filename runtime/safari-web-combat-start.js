import { resolveDayBoardCellDispatch } from "./mapless-day-board-cell-dispatch.js";
import { resolveBrowserMaplessWildEncounter } from "./browser-mapless-wild-encounter-runtime.js";
import { resolveBattleStartCore } from "./battle-core-start-handoff.js";
import { resolvePokemonRuntimeMasters } from "./pokemon-runtime-masters.js";
import { nextSafariEncounterSpeciesIndex } from "./safari-encounter-randomization.js";
import { ensureSafariGeneralCombatData, safariGeneralCombatModules, safariGeneralCombatReady } from "./safari-general-data-demand.js";
import { SAFARI_MOVE_MASTERS, SAFARI_NATURE_MASTERS, SAFARI_SPECIES_MASTERS, SAFARI_ZERO_STAT_VALUES } from "./safari-playable-data.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function moveId(move) { return typeof move === "string" ? move : move?.id; }
function unitFromUint32(value) { return (Number(value) >>> 0) / 0x100000000; }
function baseTurnInput(state, index) {
  return {
    index,
    day: state.day,
    board_events: state.board_events,
    board_revealed: state.board_revealed,
    board_consumed: state.board_consumed,
    board_visited: state.board_visited,
    notice: state.notice,
    scene_is_self: true,
    scene_same: true,
    event_stage_active: true,
    pending_hatches: [],
  };
}
function materializePokemon(input) {
  const speciesMaster = SAFARI_SPECIES_MASTERS[input?.species];
  if (!speciesMaster) throw new RangeError(`species is outside the Safari GENERAL projection: ${input?.species}`);
  const moves = (input.moves ?? input.move_ids ?? []).map(moveId);
  for (const id of moves) if (!SAFARI_MOVE_MASTERS[id]) throw new RangeError(`move is outside the Safari GENERAL projection: ${id}`);
  const natureId = input.nature_id ?? "HARDY";
  return resolvePokemonRuntimeMasters({
    ...input,
    hp: input.hp ?? 1,
    nature_id: natureId,
    iv: input.iv ?? { ...SAFARI_ZERO_STAT_VALUES },
    ev: input.ev ?? { ...SAFARI_ZERO_STAT_VALUES },
    moves,
  }, {
    species_master: speciesMaster,
    nature_master: SAFARI_NATURE_MASTERS[natureId],
    move_masters: SAFARI_MOVE_MASTERS,
  });
}
function setBattle(runtime, index, kind, opponent, operations, trainer = null, encounterResolution = null, generated = null) {
  const state = stateOf(runtime);
  const battleStart = resolveBattleStartCore({ sendOuts: [[0, runtime.player.party[0]], [1, opponent]] });
  const lastOperations = [...operations, ...(encounterResolution?.operations ?? []), ...battleStart.operations];
  state.battle = {
    kind,
    board_index: index,
    turn: 1,
    decision: 0,
    completed: false,
    captured: false,
    foe: opponent,
    trainer,
    trainer_party: trainer?.party?.map(materializePokemon) ?? null,
    trainer_party_index: trainer ? 0 : null,
    trainer_seed: trainer?.seed ?? null,
    prize_money: trainer?.prize_money ?? null,
    skill_level: trainer?.skill_level ?? null,
    encounter_request: encounterResolution?.request ?? null,
    encounter: encounterResolution?.encounter ?? null,
    encounter_cleanup: encounterResolution?.cleanup ?? [],
    general_selection: generated?.selection ?? null,
    last_operations: lastOperations,
    presentation: [{ type: "battle_started", actor: "foe", species: opponent.species, trainer: trainer?.trainer_full_name ?? null }],
  };
  state.last_operations = lastOperations;
}
function startWild(runtime, event, index, operations) {
  const { encounterRuntime } = safariGeneralCombatModules("wild");
  const state = stateOf(runtime);
  const speciesRoll = unitFromUint32(nextSafariEncounterSpeciesIndex(state, { day: state.day, boardIndex: index }));
  const varianceRoll = unitFromUint32(nextSafariEncounterSpeciesIndex(state, { day: state.day, boardIndex: index }));
  const generated = encounterRuntime.resolveSafariGeneralEncounter({
    day: state.day,
    requiredType: event.type,
    enemyRank: "NORMAL",
    extraModifier: 0,
    speciesRoll,
    varianceRoll,
  });
  const encounterResolution = resolveBrowserMaplessWildEncounter({
    day: state.day,
    event,
    boardIndex: index,
    generated,
    variance: generated.variance,
    minLevel: generated.min_level,
    maxLevel: generated.max_level,
    gameTempPresent: true,
  });
  const encounter = encounterResolution.encounter;
  const opponent = materializePokemon({ species: encounter.species_id, level: encounter.level, status: "NONE", moves: encounter.move_ids });
  setBattle(runtime, index, "wild", opponent, operations, null, encounterResolution, generated);
  state.notice = `野生の${encounter.species_name}が現れた！`;
}
function startTrainer(runtime, event, index, operations) {
  const { trainerGenerator } = safariGeneralCombatModules("trainer");
  const state = stateOf(runtime);
  const trainer = trainerGenerator.generateSafariDynamicTrainer({ day: state.day, seed: event.trainer_seed });
  const party = trainer.party.map(materializePokemon);
  setBattle(runtime, index, "trainer", party[0], operations, trainer);
  state.battle.trainer_party = party;
  state.notice = `${trainer.trainer_full_name}が勝負を仕掛けてきた！`;
}

export async function activateSafariWebCombatCell(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || !["wild", "trainer"].includes(event.kind)) throw new Error("wild or trainer board event is required");
  if (state.battle && !state.battle.completed) return { runtime, result: "battle_active", boundary: "battle", notice: "戦闘を先に終えてください。", operations: [] };
  if (state.shop) return { runtime, result: "shop_active", boundary: "shop", notice: "ショップを先に終了してください。", operations: [] };
  if (!safariGeneralCombatReady(event.kind)) {
    state.notice = "戦闘データを読み込んでいます…";
    await ensureSafariGeneralCombatData(event.kind);
  }
  const dispatch = resolveDayBoardCellDispatch({ ...baseTurnInput(state, index), reusable: false });
  state.board_events = dispatch.state.board_events;
  state.board_revealed = dispatch.state.board_revealed;
  state.board_consumed = dispatch.state.board_consumed;
  state.last_operations = dispatch.operations;
  state.notice = dispatch.notice;
  if (dispatch.result === "dispatched") {
    if (event.kind === "wild") startWild(runtime, event, index, dispatch.operations);
    else startTrainer(runtime, event, index, dispatch.operations);
  }
  globalThis.__maplessSafariRuntime = runtime;
  return {
    runtime,
    result: dispatch.result,
    boundary: event.kind,
    notice: state.notice,
    operations: state.battle?.last_operations ?? dispatch.operations,
    presentation: state.battle?.presentation ?? [],
    trainer: state.battle?.trainer ?? null,
  };
}
