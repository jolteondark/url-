export * from "./safari-normal-battle-round-base.js";

import {
  replaceSafariNormalBattlePlayer as replaceSafariNormalBattlePlayerBase,
  resolveSafariNormalBattleOpponentResponse as resolveSafariNormalBattleOpponentResponseBase,
  resolveSafariNormalBattleRound as resolveSafariNormalBattleRoundBase,
} from "./safari-normal-battle-round-base.js";
import {
  assertChoiceSelectionCanonical,
  clearChoiceLockCanonical,
  updateChoiceLockAfterResolvedRound,
} from "./item-held-choice-life-orb-effects.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("runtime variables.mapless state is required");
  }
  return state;
}

function injectFoeChoiceLock(battle) {
  if (!battle?.foe || typeof battle.foe !== "object") return;
  const locked = battle.foe_choice_locked_move_id ?? null;
  if (locked) battle.foe.__battle_choice_locked_move_id = String(locked).toUpperCase();
  else delete battle.foe.__battle_choice_locked_move_id;
}

function activePlayer(runtime, battle) {
  return runtime?.player?.party?.[Number(battle?.player_party_index ?? 0)] ?? null;
}

function updateChoiceLocksAfterRound(runtime, playerBefore, foeBefore, selectedMoveId, result, playerUsedMove) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle || Number(result?.decision ?? 0) !== 0) return;

  if (playerUsedMove && !result?.playerReplacementApplied) {
    updateChoiceLockAfterResolvedRound({
      battle,
      pokemon: playerBefore,
      selectedMoveId,
      resolved: result,
      battlerIndex: 0,
      stateKey: "player_choice_locked_move_id",
    });
  }
  if (result?.playerReplacementApplied) clearChoiceLockCanonical(battle, "player_choice_locked_move_id");

  if (result?.foeReplacementApplied) {
    clearChoiceLockCanonical(battle, "foe_choice_locked_move_id");
  } else {
    updateChoiceLockAfterResolvedRound({
      battle,
      pokemon: foeBefore,
      selectedMoveId: result?.opponentChoice?.moveId ?? null,
      resolved: result,
      battlerIndex: 1,
      stateKey: "foe_choice_locked_move_id",
    });
  }
  injectFoeChoiceLock(battle);
}

function prepareRound(runtime, selectedMoveId, playerUsedMove) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle || battle.completed) throw new Error("active battle is required");
  const player = activePlayer(runtime, battle);
  if (!player) throw new Error("active player Pokemon is required");
  if (playerUsedMove) {
    assertChoiceSelectionCanonical({
      pokemon: player,
      selectedMoveId,
      lockedMoveId: battle.player_choice_locked_move_id,
    });
  }
  injectFoeChoiceLock(battle);
  return {
    battle,
    player: structuredClone(player),
    foe: structuredClone(battle.foe),
  };
}

export function resolveSafariNormalBattleRound(runtime, selectedMoveId) {
  const before = prepareRound(runtime, selectedMoveId, true);
  const result = resolveSafariNormalBattleRoundBase(runtime, selectedMoveId);
  updateChoiceLocksAfterRound(runtime, before.player, before.foe, selectedMoveId, result, true);
  return result;
}

export function resolveSafariNormalBattleOpponentResponse(runtime) {
  const before = prepareRound(runtime, null, false);
  const result = resolveSafariNormalBattleOpponentResponseBase(runtime);
  updateChoiceLocksAfterRound(runtime, before.player, before.foe, null, result, false);
  return result;
}

export function resolveSafariNormalWildOpponentResponse(runtime) {
  const battle = stateOf(runtime).battle;
  if (!battle || battle.completed || battle.kind !== "wild") throw new Error("active wild battle is required");
  return resolveSafariNormalBattleOpponentResponse(runtime);
}

export function replaceSafariNormalBattlePlayer(runtime, replacementPartyIndex) {
  const result = replaceSafariNormalBattlePlayerBase(runtime, replacementPartyIndex);
  if (result?.result === "replaced") {
    const battle = stateOf(runtime).battle;
    if (battle) clearChoiceLockCanonical(battle, "player_choice_locked_move_id");
  }
  return result;
}
