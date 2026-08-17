import * as base from "./safari-playable-integration-wounded.js";
import { resolveBrowserBattleRound } from "./browser-battle-round-runtime.js";
import { resolveBoundaryTrialBattleHandoff } from "./mapless-boundary-trial-battle-handoff.js";
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
  battle.completed = true;
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

function resolveBoundaryRound(runtime, selectedMoveId) {
  const state = stateOf(runtime);
  const battle = state.battle;
  const player = runtime.player?.party?.[0];
  if (!player) throw new Error("active player Pokemon is required");
  const selected = moveId(selectedMoveId);
  if (!player.moves.some((move) => moveId(move) === selected)) throw new RangeError("selected move is not known by the active Pokemon");
  if (!SAFARI_MOVE_PRESENTATION[selected] || !SAFARI_MOVE_MASTERS[selected]) throw new RangeError("selected move is outside the Safari projection");
  const foeMoveId = moveId(battle.foe?.moves?.[0]);
  if (!foeMoveId || !SAFARI_MOVE_MASTERS[foeMoveId]) throw new RangeError(`boundary foe move is outside the Safari projection: ${foeMoveId}`);

  const resolved = resolveBrowserBattleRound({
    player,
    foe: battle.foe,
    playerParty: runtime.player.party,
    foeParty: battle.trainer_party,
    playerActivePartyIndex: 0,
    foeActivePartyIndex: Number(battle.trainer_party_index ?? 0),
    selectedMoveId: selected,
    foeMoveId,
    moveMasters: SAFARI_MOVE_MASTERS,
  });
  const operations = resolved.operations.map((operation) => ({ ...operation, battleTurn: battle.turn }));
  runtime.player.party[0] = resolved.player;
  const activeIndex = Number(battle.trainer_party_index ?? 0);
  battle.trainer_party[activeIndex] = structuredClone(resolved.foe);
  battle.foe = structuredClone(resolved.foe);
  battle.decision = Number(resolved.decision);
  battle.turn += 1;
  battle.last_operations = operations;
  battle.presentation = battlePresentation(operations);
  state.last_operations = operations;
  let handoff = null;
  if (battle.decision > 0) handoff = finalizeBoundaryBattle(runtime, battle, battle.decision);
  return {
    runtime,
    decision: battle.decision,
    operations: battle.last_operations,
    presentation: battle.presentation,
    scheduling: resolved.scheduling,
    ppIntegration: resolved.ppIntegration,
    battleRuntimeIntegration: resolved.battleRuntimeIntegration,
    battleContinuationHandoff: resolved.battleContinuationHandoff,
    battleResultHandoff: resolved.battleResultHandoff,
    boundaryTrialHandoff: handoff,
    persistenceRequested: requestsSave(battle.last_operations),
  };
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
    state.last_operations = [{ op: "return_to_day_board", from: "boundary_trial", day: state.day }];
    return { runtime, target: "day_board", summary, operations: state.last_operations };
  }
  state.location = "boundary_trial";
  state.battle = null;
  state.notice = "境界の試練に戻りました。";
  state.last_operations = [{ op: "return_to_boundary_trial", decision: summary.decision }];
  return { runtime, target: "boundary_trial", summary, operations: state.last_operations };
}
