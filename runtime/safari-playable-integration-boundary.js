import * as base from "./safari-playable-integration-wounded.js";
import { resolveBrowserBattleRound } from "./browser-battle-round-runtime.js";
import { resolveBrowserPlayerReplacementContinuation } from "./browser-player-replacement-continuation.js";
import { resolveBrowserTrainerReplacementContinuation } from "./browser-trainer-replacement-continuation.js";
import { resolveBoundaryTrialBattleHandoff } from "./mapless-boundary-trial-battle-handoff.js";
import {
  SAFARI_BATTLE_PHASE,
  abortSafariBattleCommand,
  abortSafariBattleReturn,
  beginSafariBattleCommand,
  beginSafariBattleReturn,
  commitSafariBattleResolution,
  completeSafariBattleReplacement,
  completeSafariBattleReturn,
} from "./safari-battle-orchestrator.js";
import { pokemonMoveTotalPp, setPokemonRuntimeMovePp, updatePokemonRuntime } from "./pokemon-runtime.js";
import { SAFARI_MOVE_PRESENTATION } from "./safari-playable-integration-base.js";
import { SAFARI_MOVE_MASTERS } from "./safari-playable-data.js";
import { createSafariPostBoundaryBoard } from "./safari-boundary-post-victory-board.js";

export * from "./safari-playable-integration-wounded.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}
function clone(value) { return value == null ? value : structuredClone(value); }
function moveId(move) { return typeof move === "string" ? move : move?.id; }
function requestsSave(operations = []) { return operations.some((operation) => operation.op === "request_save" || operation.op === "autosave_request"); }

function battlePresentation(operations) {
  const events = [];
  for (const operation of operations ?? []) {
    if (operation.op === "use_move") {
      events.push({ type: "move_selected", actor: operation.actor, moveId: operation.moveId });
      events.push({ type: "move_started", actor: operation.actor, target: operation.target, moveId: operation.moveId });
    } else if (operation.op === "accuracy_check" && !operation.hit) {
      events.push({ type: "miss", actor: operation.actor, target: operation.target });
    } else if (operation.op === "reduce_hp" || operation.op === "reduce_self_hp") {
      events.push({ type: "damage_applied", actor: operation.actor, target: operation.target, amount: operation.amount, hpBefore: operation.hpBefore, hpAfter: operation.hpAfter });
    } else if (operation.op === "faint" || operation.op === "faint_self") {
      events.push({ type: "faint", target: operation.target });
    } else if (operation.op === "end_of_round" || operation.op === "end_of_round_phase") {
      events.push({ type: "turn_end", turn: operation.battleTurn ?? operation.turn ?? operation.round });
    }
  }
  return events;
}

function boundaryInput(state) {
  const trial = state.boundary_trial ?? {};
  return {
    floor: Number(trial.trial_floor ?? state.day),
    leader_bag: Array.isArray(trial.leader_bag) ? [...trial.leader_bag] : [],
    last_leader: trial.last_leader ?? null,
    pending_leader: trial.pending_leader ?? null,
    trial_count: Number(trial.trial_count ?? 0),
    trial_started: Boolean(trial.trial_started),
    trial_cleared: Boolean(trial.trial_cleared),
    trial_floor: trial.trial_floor ?? state.day,
  };
}

function fullyHealPokemon(pokemon) {
  let healed = updatePokemonRuntime(pokemon, { hp: pokemon.max_hp ?? pokemon.hp ?? 1, status: "NONE", status_count: 0 });
  for (let index = 0; index < healed.moves.length; index += 1) {
    const id = moveId(healed.moves[index]);
    const master = SAFARI_MOVE_MASTERS[id];
    if (!master) continue;
    const ppup = typeof healed.moves[index] === "string" ? 0 : Number(healed.moves[index].ppup ?? 0);
    healed = setPokemonRuntimeMovePp(healed, index, pokemonMoveTotalPp(master.total_pp, ppup), master.total_pp);
  }
  return healed;
}

function finalizeBoundaryBattle(runtime, battle, decision) {
  const state = stateOf(runtime);
  const handoff = resolveBoundaryTrialBattleHandoff({
    boundary: boundaryInput(state),
    battleRuntime: { battleResultHandoff: { decision } },
    runEndPending: false,
  });
  state.boundary_trial = {
    ...structuredClone(handoff.boundary.state),
    result: handoff.result,
    battle_request: structuredClone(handoff.boundary.battle_request ?? battle.boundary_trial_request ?? null),
  };
  const completionOperations = (handoff.boundary.operations ?? []).map((operation) => ({
    ...structuredClone(operation), owner: "mapless-boundary-trial-flow",
  }));
  if (decision === 1) runtime.player.party = runtime.player.party.map(fullyHealPokemon);
  battle.decision = decision;
  battle.return_target = decision === 1 ? "day_board" : "boundary_trial";
  battle.last_operations = [...battle.last_operations, ...completionOperations];
  battle.presentation = [
    ...battle.presentation,
    { type: "battle_result", decision, captured: false, expGained: 0, reward: null, moneyGained: 0, returnTarget: battle.return_target },
  ];
  state.last_operations = completionOperations;
  state.notice = decision === 1 ? "強者の残響が、闇の中へ消えていく。境界が開かれた。" : "境界の試練は決着した。";
  return handoff;
}

function pendingPlayerReplacement(battle) {
  if (!battle?.player_replacement_required || !battle.player_replacement_handoff) return null;
  return resolveBrowserPlayerReplacementContinuation({
    battleContinuationHandoff: battle.player_replacement_handoff,
    replacementPartyIndex: null,
    partyOrder: Array.isArray(battle.player_party_order) ? battle.player_party_order : null,
    idxBattler: 0,
    sideSize: 1,
  });
}

function commitBoundaryTrainerReplacement(runtime, result) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!result?.foeReplacementRequired || !result?.battleContinuationHandoff?.foeReplacementRequired) return result;

  const continuation = resolveBrowserTrainerReplacementContinuation({
    battleContinuationHandoff: result.battleContinuationHandoff,
    partyOrder: Array.isArray(battle.trainer_party_order) ? battle.trainer_party_order : null,
    idxBattler: 1,
    sideSize: 1,
  });
  if (continuation.result !== "continued_with_replacement") {
    throw new Error(`boundary trainer replacement owner did not continue: ${continuation.result}`);
  }

  const handoff = continuation.battleContinuationHandoff;
  if (Array.isArray(handoff?.foeParty)) battle.trainer_party = clone(handoff.foeParty);
  battle.trainer_party_index = Number(handoff?.foeActivePartyIndex ?? battle.trainer_party_index ?? 0);
  if (continuation.partyOrder) battle.trainer_party_order = clone(continuation.partyOrder);
  battle.foe = clone(continuation.activeFoe);

  const battleTurn = Math.max(1, Number(battle.turn ?? 1) - 1);
  const switchOperations = (continuation.operations ?? []).map((operation) => ({
    ...clone(operation),
    battleTurn,
  }));
  battle.last_operations = [...(battle.last_operations ?? result.operations ?? []), ...switchOperations];
  battle.presentation = battlePresentation(battle.last_operations);
  state.last_operations = clone(battle.last_operations);

  return {
    ...result,
    foe: clone(continuation.activeFoe),
    battleContinuationHandoff: clone(handoff),
    trainerReplacementContinuation: continuation,
    foeReplacementRequired: false,
    foeReplacementApplied: true,
    replacementApplied: true,
    operations: clone(battle.last_operations),
    presentation: clone(battle.presentation),
  };
}

function resolveBoundaryRound(runtime, selectedMoveId) {
  const state = stateOf(runtime);
  const battle = state.battle;
  const pendingReplacement = pendingPlayerReplacement(battle);
  if (pendingReplacement?.result === "replacement_selection_required") {
    return {
      runtime,
      result: "player_replacement_selection_required",
      decision: 0,
      operations: [],
      presentation: battle.presentation ?? [],
      playerReplacementContinuation: pendingReplacement,
      battleContinuationHandoff: clone(battle.player_replacement_handoff),
      persistenceRequested: false,
      phase: battle.phase ?? SAFARI_BATTLE_PHASE.REPLACEMENT,
      phaseTrace: clone(battle.phase_trace ?? []),
    };
  }

  const playerActiveIndex = Number(battle.player_party_index ?? 0);
  const player = runtime.player?.party?.[playerActiveIndex];
  if (!player) throw new Error("active player Pokemon is required");
  const selected = moveId(selectedMoveId);
  if (!player.moves.some((move) => moveId(move) === selected)) throw new RangeError("selected move is not known by the active Pokemon");
  if (!SAFARI_MOVE_PRESENTATION[selected] || !SAFARI_MOVE_MASTERS[selected]) throw new RangeError("selected move is outside the Safari projection");
  const foeMoveId = moveId(battle.foe?.moves?.[0]);
  if (!foeMoveId || !SAFARI_MOVE_MASTERS[foeMoveId]) throw new RangeError(`boundary foe move is outside the Safari projection: ${foeMoveId}`);

  beginSafariBattleCommand(runtime, "move");
  let resolved;
  try {
    resolved = resolveBrowserBattleRound({
      player,
      foe: battle.foe,
      playerParty: runtime.player.party,
      foeParty: battle.trainer_party,
      playerActivePartyIndex: playerActiveIndex,
      foeActivePartyIndex: Number(battle.trainer_party_index ?? 0),
      selectedMoveId: selected,
      foeMoveId,
      moveMasters: SAFARI_MOVE_MASTERS,
    });
  } catch (error) {
    abortSafariBattleCommand(runtime, "boundary round failed");
    throw error;
  }

  const operations = (resolved.operations ?? []).map((operation) => ({ ...operation, battleTurn: battle.turn }));
  const continuationHandoff = resolved.battleContinuationHandoff;
  if (Array.isArray(continuationHandoff?.playerParty)) runtime.player.party = clone(continuationHandoff.playerParty);
  else runtime.player.party[playerActiveIndex] = resolved.player;
  battle.player_party_index = Number(continuationHandoff?.playerActivePartyIndex ?? playerActiveIndex);
  battle.player_replacement_required = Boolean(continuationHandoff?.playerReplacementRequired);
  battle.player_replacement_handoff = battle.player_replacement_required ? clone(continuationHandoff) : null;

  if (Array.isArray(continuationHandoff?.foeParty)) battle.trainer_party = clone(continuationHandoff.foeParty);
  const activeIndex = Number(continuationHandoff?.foeActivePartyIndex ?? battle.trainer_party_index ?? 0);
  battle.trainer_party_index = activeIndex;
  battle.foe = clone(battle.trainer_party?.[activeIndex] ?? resolved.foe);
  battle.decision = Number(resolved.decision);
  battle.turn += 1;
  battle.last_operations = operations;
  battle.presentation = battlePresentation(operations);
  state.last_operations = operations;

  let handoff = null;
  if (battle.decision > 0) {
    battle.player_replacement_required = false;
    battle.player_replacement_handoff = null;
  }

  const foeReplacementRequired = battle.decision === 0 && Boolean(continuationHandoff?.foeReplacementRequired);
  const resolution = {
    ...resolved,
    runtime,
    decision: battle.decision,
    operations: battle.last_operations,
    presentation: battle.presentation,
    playerReplacementRequired: Boolean(battle.player_replacement_required),
    foeReplacementRequired,
    foeReplacementApplied: false,
    replacementApplied: false,
    persistenceRequested: requestsSave(battle.last_operations),
  };
  const committed = commitSafariBattleResolution(runtime, resolution, "move", {
    replacementCommit: (result) => commitBoundaryTrainerReplacement(runtime, result),
    rewardGrowthCommit: battle.decision > 0 ? (result) => {
      handoff = finalizeBoundaryBattle(runtime, battle, battle.decision);
      result.operations = clone(battle.last_operations);
      result.presentation = clone(battle.presentation);
      result.boundaryTrialHandoff = handoff;
      return result;
    } : null,
  });

  const playerReplacementContinuation = pendingPlayerReplacement(battle);
  return {
    ...committed,
    runtime,
    decision: battle.decision,
    operations: battle.last_operations,
    presentation: battle.presentation,
    scheduling: resolved.scheduling,
    ppIntegration: resolved.ppIntegration,
    battleRuntimeIntegration: resolved.battleRuntimeIntegration,
    battleContinuationHandoff: committed.battleContinuationHandoff ?? resolved.battleContinuationHandoff,
    battleResultHandoff: resolved.battleResultHandoff,
    playerReplacementContinuation,
    playerReplacementRequired: Boolean(battle.player_replacement_required),
    boundaryTrialHandoff: handoff,
    persistenceRequested: Boolean(committed.persistenceRequested || requestsSave(battle.last_operations)),
  };
}

function commitBoundaryPlayerReplacement(runtime, prepared) {
  const state = stateOf(runtime);
  const battle = state.battle;
  const continuation = prepared?.playerReplacementContinuation;
  if (continuation?.result !== "continued_with_replacement") {
    throw new Error(`boundary player replacement owner did not continue: ${continuation?.result ?? "missing"}`);
  }

  const handoff = continuation.battleContinuationHandoff;
  runtime.player.party = clone(handoff.playerParty);
  battle.player_party_index = Number(handoff.playerActivePartyIndex);
  battle.player_party_order = clone(continuation.partyOrder ?? battle.player_party_order ?? null);
  battle.player_replacement_required = false;
  battle.player_replacement_handoff = null;
  const operations = (continuation.operations ?? []).map((operation) => ({ ...clone(operation), battleTurn: battle.turn }));
  battle.last_operations = [...(battle.last_operations ?? []), ...operations];
  state.last_operations = operations;

  return {
    ...prepared,
    result: "continued_with_replacement",
    operations,
    playerReplacementRequired: false,
    playerReplacementApplied: true,
    activePlayer: clone(continuation.activePlayer),
    playerActivePartyIndex: battle.player_party_index,
    playerPartyOrder: clone(battle.player_party_order),
  };
}

export function resolveSafariBoundaryPlayerReplacement(runtime, replacementPartyIndex = null) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (battle?.origin !== "boundary_trial" || battle.completed) throw new Error("active boundary battle is required");
  if (!battle.player_replacement_required || !battle.player_replacement_handoff) {
    return {
      runtime,
      result: "no_replacement_required",
      decision: Number(battle.decision ?? 0),
      operations: [],
      playerReplacementContinuation: null,
    };
  }

  const continuation = resolveBrowserPlayerReplacementContinuation({
    battleContinuationHandoff: battle.player_replacement_handoff,
    replacementPartyIndex,
    partyOrder: Array.isArray(battle.player_party_order) ? battle.player_party_order : null,
    idxBattler: 0,
    sideSize: 1,
  });
  if (continuation.result !== "continued_with_replacement") {
    return {
      runtime,
      result: continuation.result,
      decision: 0,
      operations: clone(continuation.operations ?? []),
      playerReplacementContinuation: continuation,
      playerReplacementRequired: true,
      phase: battle.phase ?? SAFARI_BATTLE_PHASE.REPLACEMENT,
      phaseTrace: clone(battle.phase_trace ?? []),
    };
  }

  const operations = (continuation.operations ?? []).map((operation) => ({ ...clone(operation), battleTurn: battle.turn }));
  const prepared = {
    runtime,
    result: "replacement_selected",
    decision: 0,
    operations,
    playerReplacementContinuation: continuation,
    playerReplacementRequired: true,
    playerReplacementApplied: false,
    activePlayer: clone(continuation.activePlayer),
    playerActivePartyIndex: Number(continuation.battleContinuationHandoff.playerActivePartyIndex),
    playerPartyOrder: clone(continuation.partyOrder ?? battle.player_party_order ?? null),
  };
  if (battle.phase === SAFARI_BATTLE_PHASE.REPLACEMENT) {
    return completeSafariBattleReplacement(runtime, prepared, {
      replacementCommit: (current) => commitBoundaryPlayerReplacement(runtime, current),
    });
  }
  return prepared;
}

export function resolveSafariBattleRound(runtime, selectedMoveId) {
  const battle = stateOf(runtime).battle;
  if (battle?.origin === "boundary_trial" && !battle.completed) return resolveBoundaryRound(runtime, selectedMoveId);
  return base.resolveSafariBattleRound(runtime, selectedMoveId);
}

export function returnSafariToDayBoard(runtime) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (battle?.origin !== "boundary_trial") return base.returnSafariToDayBoard(runtime);
  if (!battle.completed) throw new Error("completed boundary battle is required");
  const summary = { decision: battle.decision, captured: false, expGained: 0, reward: null };
  beginSafariBattleReturn(runtime);
  try {
    let result;
    if (battle.decision === 1) {
      const nextDay = Number(state.boundary_trial?.day ?? state.day + 1);
      const board = createSafariPostBoundaryBoard(nextDay);
      state.day = board.day;
      state.board_events = board.board_events;
      state.board_revealed = board.board_revealed;
      state.board_consumed = board.board_consumed;
      state.board_visited = board.board_visited;
      state.location = "day_board";
      state.board_suspended_for_boundary = false;
      state.notice = "境界を越え、次のDay Boardへ進みました。";
      state.battle = null;
      result = { runtime, target: "day_board", summary, operations: [{ op: "return_to_day_board", from: "boundary_trial", day: state.day }] };
    } else {
      state.location = "boundary_trial";
      state.battle = null;
      state.notice = "境界の試練に戻りました。";
      result = { runtime, target: "boundary_trial", summary, operations: [{ op: "return_to_boundary_trial", decision: summary.decision }] };
    }
    return completeSafariBattleReturn(runtime, result);
  } catch (error) {
    if (state.battle) abortSafariBattleReturn(runtime, "boundary return failed");
    throw error;
  }
}