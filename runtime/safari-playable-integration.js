import * as base from "./safari-playable-integration-base.js";
import { resolveDayBoardCellDispatch } from "./mapless-day-board-cell-dispatch.js";
import { projectDayBoardEventName } from "./mapless-day-board-event-name-projection.js";
import { resolveBrowserMaplessWildEncounter } from "./browser-mapless-wild-encounter-runtime.js";
import { resolveBattleStartCore } from "./battle-core-start-handoff.js";
import { resolvePokemonRuntimeMasters } from "./pokemon-runtime-masters.js";
import { movePartyPokemonToLead } from "./party-order-management.js";
import { ensureSafariEncounterSeed, nextSafariEncounterSpeciesIndex } from "./safari-encounter-randomization.js";
import {
  SAFARI_MOVE_MASTERS,
  SAFARI_NATURE_MASTERS,
  SAFARI_SPECIES_MASTERS,
  SAFARI_ZERO_STAT_VALUES,
} from "./safari-playable-data.js";
import {
  SAFARI_GENERAL_TYPES,
  SAFARI_GENERAL_TYPE_NAMES,
  resolveSafariGeneralEncounter,
} from "./safari-general-encounter-runtime.js";

export * from "./safari-playable-integration-base.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("runtime variables.mapless state is required");
  }
  return state;
}

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

function wildTypeFor(day, ordinal) {
  const index = ((Math.max(1, Number(day)) - 1) * 2 + ordinal) % SAFARI_GENERAL_TYPES.length;
  return SAFARI_GENERAL_TYPES[index];
}

function assignFullWildTypes(state) {
  let ordinal = 0;
  state.board_events = state.board_events.map((event) => {
    if (event.kind !== "wild") return event;
    const type = wildTypeFor(state.day, ordinal++);
    return { ...event, type };
  });
  return state;
}

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

function materializeGeneralPokemon(input) {
  const speciesMaster = SAFARI_SPECIES_MASTERS[input?.species];
  if (!speciesMaster) throw new RangeError(`species is outside the Safari GENERAL projection: ${input?.species}`);
  const moves = (input.moves ?? []).map((move) => {
    const id = moveId(move);
    if (!SAFARI_MOVE_MASTERS[id]) throw new RangeError(`move is outside the Safari GENERAL projection: ${id}`);
    return typeof move === "string" ? id : { ...move, id };
  });
  const natureId = input.nature_for_stats_id ?? input.nature_id ?? "HARDY";
  return resolvePokemonRuntimeMasters({
    ...input,
    hp: input.hp ?? 1,
    nature_id: input.nature_id ?? natureId,
    iv: input.iv ?? { ...SAFARI_ZERO_STAT_VALUES },
    ev: input.ev ?? { ...SAFARI_ZERO_STAT_VALUES },
    moves,
  }, {
    species_master: speciesMaster,
    nature_master: SAFARI_NATURE_MASTERS[natureId],
    move_masters: SAFARI_MOVE_MASTERS,
  });
}

function startFullWildBattle(runtime, event, index, dispatchOperations) {
  const state = stateOf(runtime);
  const generated = resolveSafariGeneralEncounter({
    day: state.day,
    requiredType: event.type,
    enemyRank: "NORMAL",
    extraModifier: 0,
    speciesIndex: nextSafariEncounterSpeciesIndex(state, { day: state.day, boardIndex: index }),
    varianceIndex: 1,
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
  const opponent = materializeGeneralPokemon({
    species: encounter.species_id,
    level: encounter.level,
    hp: 1,
    nature_id: "HARDY",
    iv: { ...SAFARI_ZERO_STAT_VALUES },
    ev: { ...SAFARI_ZERO_STAT_VALUES },
    status: "NONE",
    moves: encounter.move_ids,
  });
  const battleStart = resolveBattleStartCore({
    sendOuts: [[0, runtime.player.party[0]], [1, opponent]],
  });
  const startOperations = [
    ...dispatchOperations,
    ...encounterResolution.operations,
    ...battleStart.operations,
  ];
  state.battle = {
    kind: "wild",
    board_index: index,
    turn: 1,
    decision: 0,
    completed: false,
    captured: false,
    foe: opponent,
    encounter_request: encounterResolution.request,
    encounter: encounterResolution.encounter,
    encounter_cleanup: encounterResolution.cleanup,
    general_selection: generated.selection,
    last_operations: startOperations,
    presentation: [{
      type: "battle_started",
      actor: "foe",
      species: opponent.species,
      trainer: null,
    }],
  };
  state.notice = `野生の${encounter.species_name}が現れた！`;
  state.last_operations = startOperations;
}

export function createSafariPlayableRuntime() {
  const runtime = base.createSafariPlayableRuntime();
  const state = stateOf(runtime);
  ensureSafariEncounterSeed(state);
  assignFullWildTypes(state);
  return runtime;
}

export function boardCellPresentation(runtime, index) {
  const state = stateOf(runtime);
  if (!Number.isInteger(index) || index < 0 || index >= state.board_events.length) {
    throw new RangeError("board index must be 0..7");
  }
  const event = state.board_events[index];
  if (event.kind !== "wild") return base.boardCellPresentation(runtime, index);
  const revealed = Boolean(state.board_revealed[index]);
  return {
    index,
    kind: event.kind,
    label: revealed ? projectDayBoardEventName(event, SAFARI_GENERAL_TYPE_NAMES) : "？？？",
    revealed,
    consumed: Boolean(state.board_consumed[index]),
    disabled: Boolean(state.board_consumed[index]),
  };
}

export function activateSafariDayBoardCell(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events[index];
  if (!event || event.kind !== "wild") {
    const result = base.activateSafariDayBoardCell(runtime, index);
    if (result.result === "day_advanced") assignFullWildTypes(stateOf(runtime));
    return result;
  }
  if (state.battle && !state.battle.completed) {
    return { runtime, result: "battle_active", boundary: "battle", notice: "戦闘を先に終えてください。", operations: [] };
  }
  if (state.shop) {
    return { runtime, result: "shop_active", boundary: "shop", notice: "ショップを先に終了してください。", operations: [] };
  }
  const dispatch = resolveDayBoardCellDispatch({ ...baseTurnInput(state, index), reusable: false });
  state.board_events = dispatch.state.board_events;
  state.board_revealed = dispatch.state.board_revealed;
  state.board_consumed = dispatch.state.board_consumed;
  state.last_operations = dispatch.operations;
  state.notice = dispatch.notice;
  if (dispatch.result === "dispatched") startFullWildBattle(runtime, event, index, dispatch.operations);
  return {
    runtime,
    result: dispatch.result,
    boundary: "wild",
    notice: state.notice,
    operations: state.battle?.last_operations ?? dispatch.operations,
    presentation: state.battle?.presentation ?? [],
  };
}

export function setSafariPartyLead(runtime, index) {
  const state = stateOf(runtime);
  if (state.battle) throw new Error("戦闘中は先頭を変更できません。");
  if (!runtime?.player || !Array.isArray(runtime.player.party)) {
    throw new TypeError("runtime player.party is required");
  }
  const result = movePartyPokemonToLead(runtime.player.party, index);
  state.notice = result.changed
    ? `${result.pokemon.species}を先頭にしました。`
    : `${result.pokemon.species}はすでに先頭です。`;
  return { ...result, runtime, notice: state.notice };
}

export function loadSafariPlayableRun(storage, currentRuntime = createSafariPlayableRuntime()) {
  const loaded = base.loadSafariPlayableRun(storage, currentRuntime);
  if (loaded.found) {
    const state = stateOf(loaded.state);
    ensureSafariEncounterSeed(state);
    assignFullWildTypes(state);
  }
  return loaded;
}
