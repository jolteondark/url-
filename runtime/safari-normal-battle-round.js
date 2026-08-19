import { resolveBrowserBattleRound } from "./browser-battle-round-runtime.js";
import { resolveBrowserTrainerBattleRound } from "./browser-trainer-battle-round-runtime.js";
import { resolveBrowserPlayerReplacementContinuation } from "./browser-player-replacement-continuation.js";
import { resolveBrowserOpponentMoveChoiceCanonical } from "./battle-core-browser-opponent-move-choice.js";
import { createBattleStatStageStateCanonical, resetBattleStatStagesForBattlerCanonical } from "./battle-core-stat-stages.js";
import { SAFARI_MOVE_MASTERS } from "./safari-playable-data.js";
import { finalizeNormalBattle, normalBattleExpInput } from "./safari-normal-battle-finalize.js";

const moveId = (move) => typeof move === "string" ? move : move?.id;

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function ensureBattleStatStages(battle) {
  battle.stat_stages = createBattleStatStageStateCanonical(battle.stat_stages);
  return battle.stat_stages;
}

function presentationCombatant(pokemon) {
  if (!pokemon) return null;
  return Object.freeze({
    species: pokemon.species ?? null,
    maxHp: Number(pokemon.max_hp ?? 0),
  });
}

function presentationContext(player, foe) {
  return Object.freeze({
    player: presentationCombatant(player),
    foe: presentationCombatant(foe),
  });
}

function bindPresentationIdentity(event, context) {
  const actor = context?.[event.actor] ?? null;
  const target = context?.[event.target] ?? null;
  return {
    ...event,
    ...(actor?.species ? { actorSpecies: actor.species } : {}),
    ...(target?.species ? { targetSpecies: target.species } : {}),
    ...(Number(target?.maxHp) > 0 ? { targetMaxHp: Number(target.maxHp) } : {}),
  };
}

export function projectSafariBattleOperationsToPresentation(operations, context = null) {
  const events = [];
  for (const operation of operations ?? []) {
    if (operation.op === "cure_status_request" && operation.status === "SLEEP") {
      events.push({ type: "status_recovered", actor: operation.actor, status: "SLEEP" });
    } else if (operation.op === "cure_status_request" && operation.status === "FROZEN") {
      events.push({ type: "status_recovered", actor: operation.actor, status: "FROZEN" });
    } else if (operation.op === "continue_status_request" && ["SLEEP", "FROZEN", "PARALYSIS"].includes(operation.status)) {
      events.push({ type: "action_blocked", actor: operation.actor, reason: operation.status.toLowerCase() });
    } else if (operation.op === "display_flinched") {
      events.push({ type: "action_blocked", actor: operation.actor, reason: "flinch" });
    } else if (operation.op === "display_confused") {
      events.push({ type: "confusion_active", actor: operation.actor });
    } else if (operation.op === "display_confusion_cured") {
      events.push({ type: "confusion_cured", actor: operation.actor });
    } else if (operation.op === "display_confusion_self_damage") {
      events.push({ type: "confusion_self_hit", actor: operation.actor });
    } else if (operation.op === "use_move") {
      events.push({ type: "move_selected", actor: operation.actor, moveId: operation.moveId });
      events.push({ type: "move_started", actor: operation.actor, target: operation.target, moveId: operation.moveId });
    } else if (operation.op === "accuracy_check" && !operation.hit) {
      events.push({ type: "miss", actor: operation.actor, target: operation.target });
    } else if (operation.op === "reduce_hp" || operation.op === "reduce_self_hp") {
      events.push({ type: "damage_applied", actor: operation.actor, target: operation.target, amount: operation.amount, hpBefore: operation.hpBefore, hpAfter: operation.hpAfter });
    } else if (operation.op === "stat_stage_change") {
      events.push({
        type: "stat_stage_changed",
        actor: Number(operation.battlerIndex) === 0 ? "player" : "foe",
        stat: operation.stat,
        appliedDelta: Number(operation.appliedDelta ?? 0),
        before: Number(operation.before ?? 0),
        after: Number(operation.after ?? 0),
      });
    } else if (operation.op === "faint" || operation.op === "faint_self") {
      events.push({ type: "faint", target: operation.target });
    } else if (operation.op === "gain_exp") {
      events.push({ type: "exp_gain", actor: "player", amount: Number(operation.amount ?? 0) });
    } else if (operation.op === "level_up") {
      events.push({ type: "level_up", actor: "player", level: Number(operation.level ?? 0) });
    } else if (operation.op === "learn_move") {
      events.push({ type: "move_learned", actor: "player", moveId: operation.move, slot: operation.slot });
    } else if (operation.op === "replace_move") {
      events.push({ type: "move_replaced", actor: "player", moveId: operation.move, forgottenMoveId: operation.forgotten, slot: operation.slot });
    } else if (operation.op === "decline_move") {
      events.push({ type: "move_declined", actor: "player", moveId: operation.move });
    } else if (operation.op === "level_evolution") {
      events.push({ type: "evolution", actor: "player", from: operation.from, to: operation.to });
    } else if (operation.op === "end_of_round" || operation.op === "end_of_round_phase") {
      events.push({ type: "turn_end", turn: operation.battleTurn ?? operation.turn ?? operation.round });
    }
  }
  return context ? events.map((event) => bindPresentationIdentity(event, context)) : events;
}

function reserveCount(party, activeIndex) {
  return Math.max(0, (Array.isArray(party) ? party : []).filter((pokemon, index) => index !== Number(activeIndex) && Number(pokemon?.hp ?? 0) > 0).length);
}

function seedFor(state, battle) {
  const turn = Math.max(1, Math.trunc(Number(battle?.turn ?? 1)));
  const base = battle.kind === "trainer"
    ? Number(battle.trainer_seed ?? 0)
    : (Math.imul(Math.max(1, Math.trunc(Number(state.day ?? 1))), 1_000_003) ^ Math.imul(Number(battle.board_index ?? 0) + 1, 97_409));
  return (base ^ Math.imul(turn, 0x45d9f3b)) & 0x7fffffff;
}

function projectPlayerReplacement(battle, handoff, continuation = null) {
  const replacement = continuation ?? resolveBrowserPlayerReplacementContinuation({
    battleContinuationHandoff: handoff,
    partyOrder: Array.isArray(battle.player_party_order) ? battle.player_party_order : null,
    idxBattler: 0,
    sideSize: 1,
  });
  const required = replacement.result === "replacement_selection_required";
  battle.player_replacement_required = required;
  battle.player_replacement_options = required
    ? (replacement.replacementOptions ?? [])
      .filter((option) => option?.canSwitchIn)
      .map((option) => ({ partyIndex: Number(option.partyIndex), pokemon: structuredClone(option.pokemon) }))
    : [];
  battle.player_replacement_handoff = required
    ? structuredClone(replacement.battleContinuationHandoff ?? handoff)
    : null;
  return replacement;
}

function finish(runtime, battle, resolved, operations) {
  const state = stateOf(runtime);
  battle.last_operations = operations;
  battle.presentation = projectSafariBattleOperationsToPresentation(operations, resolved.presentationContext ?? null);
  state.last_operations = operations;
  if (Number(battle.decision) !== 0) finalizeNormalBattle(runtime);
  return {
    ...resolved,
    runtime,
    decision: Number(battle.decision),
    operations: Number(battle.decision) !== 0 ? battle.last_operations : operations,
    presentation: battle.presentation,
    playerReplacementRequired: Boolean(battle.player_replacement_required),
    playerReplacementOptions: structuredClone(battle.player_replacement_options ?? []),
    persistenceRequested: false,
  };
}

function resolveTrainer(runtime, selectedMoveId, playerActionConsumedWithoutMove = false) {
  const state = stateOf(runtime);
  const battle = state.battle;
  const playerIndex = Number(battle.player_party_index ?? 0);
  const player = runtime.player.party[playerIndex];
  if (!player) throw new Error("active player Pokemon is required");
  const defeatedFoe = structuredClone(battle.foe);
  const roundPresentationContext = presentationContext(player, defeatedFoe);
  const resolved = resolveBrowserTrainerBattleRound({
    roundInput: {
      player,
      foe: battle.foe,
      playerParty: runtime.player.party,
      foeParty: battle.trainer_party,
      playerActivePartyIndex: playerIndex,
      foeActivePartyIndex: Number(battle.trainer_party_index ?? 0),
      selectedMoveId,
      moveMasters: SAFARI_MOVE_MASTERS,
      playerBattleExpInput: playerActionConsumedWithoutMove ? null : normalBattleExpInput(player, defeatedFoe, true),
      playerActionConsumedWithoutMove,
      battleStatStages: ensureBattleStatStages(battle),
    },
    ownedOpponentInput: {
      battleKind: "trainer",
      foeAiRandomSeed: seedFor(state, battle),
      trainerSkill: Number(battle.skill_level ?? 0),
      trainerFlags: Array.isArray(battle.trainer_flags) ? battle.trainer_flags : [],
      foeReserveCount: reserveCount(battle.trainer_party, battle.trainer_party_index),
      playerReserveCount: reserveCount(runtime.player.party, playerIndex),
      mechanicsGeneration: 9,
      turnCount: Math.max(0, Number(battle.turn ?? 1) - 1),
      canSwitchLax: false,
    },
    partyOrder: Array.isArray(battle.trainer_party_order) ? battle.trainer_party_order : null,
    idxBattler: 1,
    sideSize: 1,
    playerPartyOrder: Array.isArray(battle.player_party_order) ? battle.player_party_order : null,
    playerIdxBattler: 0,
  });
  const next = resolved.nextRoundState;
  if (Array.isArray(next?.playerParty)) runtime.player.party = structuredClone(next.playerParty);
  else runtime.player.party[playerIndex] = structuredClone(resolved.player);
  battle.player_party_index = Number(next?.playerActivePartyIndex ?? playerIndex);
  battle.player_party_order = structuredClone(next?.playerPartyOrder ?? battle.player_party_order ?? null);
  if (Array.isArray(next?.foeParty)) battle.trainer_party = structuredClone(next.foeParty);
  battle.trainer_party_index = Number(next?.foeActivePartyIndex ?? battle.trainer_party_index ?? 0);
  battle.trainer_party_order = structuredClone(next?.partyOrder ?? battle.trainer_party_order ?? null);
  battle.foe = structuredClone(resolved.foe);
  battle.stat_stages = createBattleStatStageStateCanonical(resolved.statStages ?? battle.stat_stages);
  if (resolved.foeReplacementApplied) battle.stat_stages = resetBattleStatStagesForBattlerCanonical(battle.stat_stages, 1);
  if (resolved.playerReplacementApplied) battle.stat_stages = resetBattleStatStagesForBattlerCanonical(battle.stat_stages, 0);
  battle.decision = Number(next?.decision ?? resolved.decision ?? 0);
  projectPlayerReplacement(battle, resolved.playerReplacementContinuation?.battleContinuationHandoff ?? resolved.battleContinuationHandoff, resolved.playerReplacementContinuation);
  const roundExpGained = (resolved.expIntegration?.commits ?? []).reduce((sum, commit) => sum + Number(commit.expGained ?? 0), 0);
  if (resolved.foeReplacementApplied) {
    battle.trainer_exp_gained = Number(battle.trainer_exp_gained ?? 0) + roundExpGained;
    battle.exp_gained = 0;
  } else if (battle.decision === 1) {
    battle.exp_gained = roundExpGained;
  }
  const turn = battle.turn;
  battle.turn += 1;
  const operations = (resolved.presentationOperations ?? resolved.operations ?? []).map((operation) => ({ ...operation, battleTurn: turn }));
  const result = finish(runtime, battle, { ...resolved, presentationContext: roundPresentationContext }, operations);
  if (resolved.foeReplacementApplied && battle.decision === 0) {
    const trainerName = battle.trainer?.trainer_full_name ?? "トレーナー";
    battle.presentation.push({ type: "trainer_next", actor: "foe", trainer: trainerName, species: battle.foe?.species ?? null, partyIndex: battle.trainer_party_index });
    state.notice = `${trainerName}は${battle.foe?.species ?? "次のポケモン"}を繰り出した！`;
  }
  return result;
}

function applyWildResolved(runtime, resolved, playerIndex) {
  const state = stateOf(runtime);
  const battle = state.battle;
  const handoff = resolved.battleContinuationHandoff;
  if (Array.isArray(handoff?.playerParty)) runtime.player.party = structuredClone(handoff.playerParty);
  else runtime.player.party[playerIndex] = structuredClone(resolved.player);
  battle.player_party_index = Number(handoff?.playerActivePartyIndex ?? playerIndex);
  battle.player_party_order = structuredClone(handoff?.playerPartyOrder ?? battle.player_party_order ?? null);
  battle.foe = structuredClone(resolved.foe);
  battle.stat_stages = createBattleStatStageStateCanonical(resolved.statStages ?? battle.stat_stages);
  battle.decision = Number(resolved.decision);
  projectPlayerReplacement(battle, handoff);
  const roundExpGained = (resolved.expIntegration?.commits ?? []).reduce((sum, commit) => sum + Number(commit.expGained ?? 0), 0);
  if (battle.decision === 1) battle.exp_gained = roundExpGained;
  const turn = battle.turn;
  battle.turn += 1;
  const operations = (resolved.operations ?? []).map((operation) => ({ ...operation, battleTurn: turn }));
  return finish(runtime, battle, resolved, operations);
}

function wildOpponentChoice(state, battle, playerIndex, player) {
  return resolveBrowserOpponentMoveChoiceCanonical({
    battleKind: "wild",
    player,
    foe: battle.foe,
    moveMasters: SAFARI_MOVE_MASTERS,
    aiRandomSeed: seedFor(state, battle),
    trainerSkill: 0,
    trainerFlags: [],
    ownReserveCount: 0,
    foeReserveCount: reserveCount(runtimePartyForChoice(player, state), playerIndex),
    mechanicsGeneration: 9,
    turnCount: Math.max(0, Number(battle.turn ?? 1) - 1),
    canSwitchLax: false,
  });
}

function runtimePartyForChoice(player, state) {
  return state?.__runtimeParty ?? player?.__party ?? [];
}

function resolveWild(runtime, selectedMoveId, playerActionConsumedWithoutMove = false) {
  const state = stateOf(runtime);
  const battle = state.battle;
  const playerIndex = Number(battle.player_party_index ?? 0);
  const player = runtime.player.party[playerIndex];
  if (!player) throw new Error("active player Pokemon is required");
  const defeatedFoe = structuredClone(battle.foe);
  const roundPresentationContext = presentationContext(player, defeatedFoe);
  const choice = resolveBrowserOpponentMoveChoiceCanonical({
    battleKind: "wild",
    player,
    foe: battle.foe,
    moveMasters: SAFARI_MOVE_MASTERS,
    aiRandomSeed: seedFor(state, battle),
    trainerSkill: 0,
    trainerFlags: [],
    ownReserveCount: 0,
    foeReserveCount: reserveCount(runtime.player.party, playerIndex),
    mechanicsGeneration: 9,
    turnCount: Math.max(0, Number(battle.turn ?? 1) - 1),
    canSwitchLax: false,
  });
  const foeMoveId = choice.command === "struggle" ? "STRUGGLE" : choice.moveId;
  const resolved = resolveBrowserBattleRound({
    player,
    foe: battle.foe,
    playerParty: runtime.player.party,
    foeParty: [battle.foe],
    playerActivePartyIndex: playerIndex,
    foeActivePartyIndex: 0,
    reflectedPartyIndex: playerIndex,
    selectedMoveId,
    foeMoveId,
    moveMasters: SAFARI_MOVE_MASTERS,
    playerBattleExpInput: playerActionConsumedWithoutMove ? null : normalBattleExpInput(player, defeatedFoe, false),
    playerActionConsumedWithoutMove,
    battleStatStages: ensureBattleStatStages(battle),
  });
  return applyWildResolved(runtime, {
    ...resolved,
    opponentChoice: choice,
    presentationContext: roundPresentationContext,
  }, playerIndex);
}

export function resolveSafariNormalBattleRound(runtime, selectedMoveId) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle || battle.completed) throw new Error("active battle is required");
  if (battle.origin === "boundary_trial") throw new Error("boundary battle must use the boundary owner");
  if (battle.player_replacement_required) throw new Error("player replacement is required before another battle command");
  if (battle.kind === "trainer") return resolveTrainer(runtime, selectedMoveId, false);
  if (battle.kind === "wild") return resolveWild(runtime, selectedMoveId, false);
  throw new RangeError(`unsupported normal battle kind: ${battle.kind}`);
}

export function resolveSafariNormalBattleOpponentResponse(runtime) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle || battle.completed) throw new Error("active battle is required");
  if (battle.origin === "boundary_trial") throw new Error("boundary battle must use the boundary owner");
  if (battle.player_replacement_required) throw new Error("player replacement is required before another battle command");
  if (battle.kind === "trainer") return resolveTrainer(runtime, null, true);
  if (battle.kind === "wild") return resolveWild(runtime, null, true);
  throw new RangeError(`unsupported normal battle kind: ${battle.kind}`);
}

export function resolveSafariNormalWildOpponentResponse(runtime) {
  const battle = stateOf(runtime).battle;
  if (!battle || battle.completed || battle.kind !== "wild") throw new Error("active wild battle is required");
  return resolveSafariNormalBattleOpponentResponse(runtime);
}

export function replaceSafariNormalBattlePlayer(runtime, replacementPartyIndex) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle || battle.completed) throw new Error("active battle is required");
  if (battle.origin === "boundary_trial") throw new Error("boundary battle must use the boundary owner");
  if (!battle.player_replacement_required || !battle.player_replacement_handoff) {
    throw new Error("player replacement is not required");
  }
  const replacement = resolveBrowserPlayerReplacementContinuation({
    battleContinuationHandoff: battle.player_replacement_handoff,
    replacementPartyIndex,
    partyOrder: Array.isArray(battle.player_party_order) ? battle.player_party_order : null,
    idxBattler: 0,
    sideSize: 1,
  });
  if (replacement.result !== "continued_with_replacement") {
    return {
      runtime,
      result: "rejected",
      ownerResult: replacement.result,
      replacementOptions: structuredClone(battle.player_replacement_options ?? []),
      operations: structuredClone(replacement.operations ?? []),
      persistenceRequested: false,
    };
  }
  const handoff = replacement.battleContinuationHandoff;
  runtime.player.party = structuredClone(handoff.playerParty);
  battle.player_party_index = Number(handoff.playerActivePartyIndex);
  battle.player_party_order = structuredClone(replacement.partyOrder ?? battle.player_party_order ?? null);
  battle.stat_stages = resetBattleStatStagesForBattlerCanonical(ensureBattleStatStages(battle), 0);
  battle.player_replacement_required = false;
  battle.player_replacement_options = [];
  battle.player_replacement_handoff = null;
  battle.last_operations = [...(battle.last_operations ?? []), ...(replacement.operations ?? [])];
  state.last_operations = structuredClone(replacement.operations ?? []);
  state.notice = `${replacement.activePlayer?.species ?? "次のポケモン"}に交代した！`;
  return {
    runtime,
    result: "replaced",
    replacementPartyIndex: Number(handoff.playerActivePartyIndex),
    activePlayer: structuredClone(replacement.activePlayer),
    operations: structuredClone(replacement.operations ?? []),
    persistenceRequested: false,
  };
}
