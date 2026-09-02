import { resolveDayBoardCellDispatch } from "./mapless-day-board-cell-dispatch.js";
import { resolveBrowserMaplessWildEncounter } from "./browser-mapless-wild-encounter-runtime.js";
import { resolveBattleStartCore } from "./battle-core-start-handoff.js";
import { createBattleStatStageStateCanonical } from "./battle-core-stat-stages.js";
import {
  planMaplessNormalEventExtraTrainerEncounter,
  selectMaplessNormalEventExtraTrainerType,
} from "./mapless-normal-event-extra-trainer-pokemon.js";
import { resolvePokemonRuntimeMasters } from "./pokemon-runtime-masters.js";
import { nextSafariEncounterSpeciesIndex } from "./safari-encounter-randomization.js";
import { ensureSafariGeneralCombatData, safariGeneralCombatModules, safariGeneralCombatReady } from "./safari-general-data-demand.js";
import {
  beginSafariNormalEventBattleContinuation,
  bindSafariNormalEventBattleContinuation,
  rollbackSafariNormalEventBattleContinuation,
} from "./safari-normal-event-battle-continuation.js";
import { SAFARI_MOVE_MASTERS, SAFARI_NATURE_MASTERS, SAFARI_SPECIES_MASTERS, SAFARI_ZERO_STAT_VALUES } from "./safari-playable-data.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function moveId(move) { return typeof move === "string" ? move : move?.id; }
function unitFromUint32(value) { return (Number(value) >>> 0) / 0x100000000; }
function notifySafariRuntimeChanged() {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function" || typeof CustomEvent !== "function") return;
  queueMicrotask(() => window.dispatchEvent(new CustomEvent("safari-runtime-changed")));
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
function setBattle(runtime, index, kind, opponent, operations, trainer = null, encounterResolution = null, generated = null, trainerParty = null) {
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
    trainer_party: trainerParty,
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
function wildEncounterExtraModifier(event) {
  const value = Number(event?.modifier ?? 0);
  return Number.isFinite(value) ? value : 0;
}
function trainerBattleExtraModifier(event) {
  const value = Number(event?.modifier ?? 0);
  return Number.isFinite(value) ? value : 0;
}
export function safariWildBattleInitialStatStages(event) {
  return createBattleStatStageStateCanonical({ foe: event?.enemy_stages ?? {} });
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
    extraModifier: wildEncounterExtraModifier(event),
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
  state.battle.stat_stages = safariWildBattleInitialStatStages(event);
  state.notice = `野生の${encounter.species_name}が現れた！`;
}
function startTrainer(runtime, event, index, operations) {
  const needsExtraPokemon = event?.extra_pokemon === true;
  const modules = safariGeneralCombatModules(needsExtraPokemon ? "both" : "trainer");
  const state = stateOf(runtime);
  const trainerSeed = event.trainer_seed ?? event.seed;
  const extraModifier = trainerBattleExtraModifier(event);
  const trainer = modules.trainerGenerator.generateSafariDynamicTrainer({
    day: state.day,
    seed: trainerSeed,
    extraModifier,
  });
  const party = trainer.party.map(materializePokemon);
  const extraOperations = [];
  let extraPokemon = null;

  // Canonical v0.9.108 generates the ordinary trainer first. Only afterwards,
  // if capacity remains, it samples TYPE_IDS from the shared/global RNG and
  // creates one separate GENERAL encounter under srand(event seed + 1).
  if (needsExtraPokemon && party.length < 6) {
    const selectedType = selectMaplessNormalEventExtraTrainerType(runtime, event.type ?? null);
    const plan = planMaplessNormalEventExtraTrainerEncounter({
      day: state.day,
      requiredType: selectedType.type,
      extraModifier,
      seed: trainerSeed,
    });
    const generated = modules.encounterRuntime.resolveSafariGeneralEncounter({
      day: state.day,
      requiredType: selectedType.type,
      enemyRank: "NORMAL",
      extraModifier,
      speciesIndex: plan.speciesIndex,
      varianceIndex: plan.varianceIndex,
    });
    extraPokemon = materializePokemon({
      species: generated.species_id,
      level: generated.resolved_level,
      status: "NONE",
      moves: generated.move_ids,
    });
    party.push(extraPokemon);
    extraOperations.push({
      op: "append_normal_event_trainer_extra_pokemon",
      type: selectedType.type,
      type_index: selectedType.typeIndex,
      type_rng: selectedType.borrowedSharedRunRng ? "shared_run" : "explicit",
      encounter_seed: plan.encounterSeed,
      variance_index: plan.varianceIndex,
      species_index: plan.speciesIndex,
      species: generated.species_id,
      level: generated.resolved_level,
    });
  }

  setBattle(runtime, index, "trainer", party[0], [...operations, ...extraOperations], trainer, null, null, party);
  if (extraPokemon) state.battle.normal_event_extra_pokemon = structuredClone(extraOperations[0]);
  state.notice = `${trainer.trainer_full_name}が勝負を仕掛けてきた！`;
}

function assertNormalEventBattleOrigin(state, index, eventId) {
  const origin = state.board_events?.[index];
  if (!origin || origin.kind !== "normal_event") throw new Error("originating normal_event board event is required");
  if (String(origin.normal_event_id ?? "") !== String(eventId ?? "")) throw new Error("normal-event battle eventId does not match the originating cell");
  return origin;
}
function assertNormalEventBattleAvailable(state) {
  if (state.battle) return { result: "battle_active", boundary: "battle", notice: "戦闘を先に終えてください。" };
  if (state.pending_battle_return_checkpoint?.committed === false) {
    return { result: "battle_return_pending", boundary: "battle", notice: "戦闘結果の保存を完了してください。" };
  }
  if (state.shop) return { result: "shop_active", boundary: "shop", notice: "ショップを先に終了してください。" };
  return null;
}

export async function activateSafariNormalEventWildBattle(runtime, index, {
  eventId,
  actionId,
  battleEvent,
  request = null,
  payload = null,
} = {}) {
  const state = stateOf(runtime);
  assertNormalEventBattleOrigin(state, index, eventId);
  if (!battleEvent || typeof battleEvent !== "object" || Array.isArray(battleEvent)) throw new TypeError("canonical wild battleEvent is required");
  const blocked = assertNormalEventBattleAvailable(state);
  if (blocked) return { runtime, ...blocked, operations: [] };

  const previousBattle = state.battle;
  const previousNotice = state.notice;
  const previousLastOperations = state.last_operations;
  const hadEncounterSeed = Object.prototype.hasOwnProperty.call(state, "preview_encounter_seed");
  const previousEncounterSeed = state.preview_encounter_seed;
  const hadEncounterCounter = Object.prototype.hasOwnProperty.call(state, "preview_encounter_counter");
  const previousEncounterCounter = state.preview_encounter_counter;
  let checkpoint = null;

  try {
    checkpoint = beginSafariNormalEventBattleContinuation(runtime, {
      boardIndex: index,
      eventId,
      actionId,
      request,
      payload,
    });
    globalThis.__maplessSafariRuntime = runtime;
    if (!safariGeneralCombatReady("wild")) {
      state.notice = "戦闘データを読み込んでいます…";
      notifySafariRuntimeChanged();
      await ensureSafariGeneralCombatData("wild");
    }
    startWild(runtime, { kind: "wild", ...structuredClone(battleEvent) }, index, []);
    bindSafariNormalEventBattleContinuation(runtime, checkpoint);
    globalThis.__maplessLastError = null;
    notifySafariRuntimeChanged();
    return {
      runtime,
      result: "normal_event_wild_battle_started",
      boundary: "wild",
      continuationKey: checkpoint.key,
      notice: state.notice,
      operations: state.battle?.last_operations ?? [],
      presentation: state.battle?.presentation ?? [],
    };
  } catch (error) {
    globalThis.__maplessLastError = error;
    state.battle = previousBattle;
    state.notice = previousNotice;
    state.last_operations = previousLastOperations;
    if (checkpoint && checkpoint.battle_started !== true) rollbackSafariNormalEventBattleContinuation(runtime, checkpoint);
    if (hadEncounterSeed) state.preview_encounter_seed = previousEncounterSeed;
    else delete state.preview_encounter_seed;
    if (hadEncounterCounter) state.preview_encounter_counter = previousEncounterCounter;
    else delete state.preview_encounter_counter;
    notifySafariRuntimeChanged();
    throw error;
  }
}

export async function activateSafariNormalEventTrainerBattle(runtime, index, {
  eventId,
  actionId,
  battleEvent,
  request = null,
  payload = null,
} = {}) {
  const state = stateOf(runtime);
  assertNormalEventBattleOrigin(state, index, eventId);
  if (!battleEvent || typeof battleEvent !== "object" || Array.isArray(battleEvent)) throw new TypeError("canonical trainer battleEvent is required");
  const blocked = assertNormalEventBattleAvailable(state);
  if (blocked) return { runtime, ...blocked, operations: [] };

  // extra_pokemon is owned as a distinct post-generator append boundary.
  // cannot_run is satisfied by the shared RUN owner because this adapter launches
  // a trainer/non-wild Battle. Keep only genuinely unowned constraints fail-closed.
  if (battleEvent.strong_ai) {
    throw new Error("normal-event trainer Battle constraint is not yet owned by the shared trainer AI policy: strong_ai");
  }
  if (battleEvent.type && battleEvent.extra_pokemon !== true) {
    throw new Error("normal-event trainer Battle type constraint is only owned for extra_pokemon append");
  }

  const previousBattle = state.battle;
  const previousNotice = state.notice;
  const previousLastOperations = state.last_operations;
  const hadEncounterSeed = Object.prototype.hasOwnProperty.call(state, "preview_encounter_seed");
  const previousEncounterSeed = state.preview_encounter_seed;
  const hadEncounterCounter = Object.prototype.hasOwnProperty.call(state, "preview_encounter_counter");
  const previousEncounterCounter = state.preview_encounter_counter;
  let checkpoint = null;

  try {
    checkpoint = beginSafariNormalEventBattleContinuation(runtime, {
      boardIndex: index,
      eventId,
      actionId,
      request,
      payload,
    });
    globalThis.__maplessSafariRuntime = runtime;
    const combatKind = battleEvent.extra_pokemon === true ? "both" : "trainer";
    if (!safariGeneralCombatReady(combatKind)) {
      state.notice = "戦闘データを読み込んでいます…";
      notifySafariRuntimeChanged();
      await ensureSafariGeneralCombatData(combatKind);
    }
    startTrainer(runtime, { kind: "trainer", ...structuredClone(battleEvent) }, index, []);
    bindSafariNormalEventBattleContinuation(runtime, checkpoint);
    globalThis.__maplessLastError = null;
    notifySafariRuntimeChanged();
    return {
      runtime,
      result: "normal_event_trainer_battle_started",
      boundary: "trainer",
      continuationKey: checkpoint.key,
      notice: state.notice,
      operations: state.battle?.last_operations ?? [],
      presentation: state.battle?.presentation ?? [],
      trainer: state.battle?.trainer ?? null,
    };
  } catch (error) {
    globalThis.__maplessLastError = error;
    state.battle = previousBattle;
    state.notice = previousNotice;
    state.last_operations = previousLastOperations;
    if (checkpoint && checkpoint.battle_started !== true) rollbackSafariNormalEventBattleContinuation(runtime, checkpoint);
    if (hadEncounterSeed) state.preview_encounter_seed = previousEncounterSeed;
    else delete state.preview_encounter_seed;
    if (hadEncounterCounter) state.preview_encounter_counter = previousEncounterCounter;
    else delete state.preview_encounter_counter;
    notifySafariRuntimeChanged();
    throw error;
  }
}

export async function activateSafariWebCombatCell(runtime, index) {
  const state = stateOf(runtime);
  const event = state.board_events?.[index];
  if (!event || !["wild", "trainer"].includes(event.kind)) throw new Error("wild or trainer board event is required");
  if (state.battle) return { runtime, result: "battle_active", boundary: "battle", notice: "戦闘を先に終えてください。", operations: [] };
  if (state.pending_battle_return_checkpoint?.committed === false) {
    return {
      runtime,
      result: "battle_return_pending",
      boundary: "battle",
      notice: "戦闘結果の保存を完了してください。",
      operations: [],
    };
  }
  if (state.shop) return { runtime, result: "shop_active", boundary: "shop", notice: "ショップを先に終了してください。" , operations: [] };

  const previousBoardEvents = state.board_events;
  const previousBoardRevealed = state.board_revealed;
  const previousBoardConsumed = state.board_consumed;
  const previousBattle = state.battle;
  const previousNotice = state.notice;
  const previousLastOperations = state.last_operations;
  const hadEncounterSeed = Object.prototype.hasOwnProperty.call(state, "preview_encounter_seed");
  const previousEncounterSeed = state.preview_encounter_seed;
  const hadEncounterCounter = Object.prototype.hasOwnProperty.call(state, "preview_encounter_counter");
  const previousEncounterCounter = state.preview_encounter_counter;

  try {
    globalThis.__maplessSafariRuntime = runtime;
    if (!safariGeneralCombatReady(event.kind)) {
      state.notice = "戦闘データを読み込んでいます…";
      notifySafariRuntimeChanged();
      await ensureSafariGeneralCombatData(event.kind);
    }
    const dispatch = resolveDayBoardCellDispatch({ ...baseTurnInput(state, index), reusable: false });
    if (dispatch.result === "dispatched") {
      if (event.kind === "wild") startWild(runtime, event, index, dispatch.operations);
      else startTrainer(runtime, event, index, dispatch.operations);
      // Canonical wild/trainer owners consume the cell only once Battle start succeeds.
      // Keep that commit after materialization so every pre-Battle failure remains retryable.
      dispatch.state.board_consumed[index] = true;
    }

    state.board_events = dispatch.state.board_events;
    state.board_revealed = dispatch.state.board_revealed;
    state.board_consumed = dispatch.state.board_consumed;
    if (dispatch.result !== "dispatched") {
      state.last_operations = dispatch.operations;
      state.notice = dispatch.notice;
    }

    if (state.battle) globalThis.__maplessLastError = null;
    if (state.battle) notifySafariRuntimeChanged();
    return {
      runtime,
      result: dispatch.result,
      boundary: event.kind,
      notice: state.notice,
      operations: state.battle?.last_operations ?? dispatch.operations,
      presentation: state.battle?.presentation ?? [],
      trainer: state.battle?.trainer ?? null,
    };
  } catch (error) {
    globalThis.__maplessLastError = error;
    state.board_events = previousBoardEvents;
    state.board_revealed = previousBoardRevealed;
    state.board_consumed = previousBoardConsumed;
    state.battle = previousBattle;
    state.notice = previousNotice;
    state.last_operations = previousLastOperations;
    if (hadEncounterSeed) state.preview_encounter_seed = previousEncounterSeed;
    else delete state.preview_encounter_seed;
    if (hadEncounterCounter) state.preview_encounter_counter = previousEncounterCounter;
    else delete state.preview_encounter_counter;
    notifySafariRuntimeChanged();
    throw error;
  }
}