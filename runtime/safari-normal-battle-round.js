export * from "./safari-normal-battle-round-pre-metronome.js";

import {
  replaceSafariNormalBattlePlayer as replaceSafariNormalBattlePlayerBase,
  resolveSafariNormalBattleOpponentResponse as resolveSafariNormalBattleOpponentResponseBase,
  resolveSafariNormalBattleRound as resolveSafariNormalBattleRoundBase,
} from "./safari-normal-battle-round-pre-metronome.js";
import {
  clearMetronomeBattleStateCanonical,
  clearMetronomePokemonTransientCanonical,
  injectMetronomeBattleStateCanonical,
  updateMetronomeBattleStateAfterResolvedRoundCanonical,
} from "./item-held-metronome-effects.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("runtime variables.mapless state is required");
  }
  return state;
}

function activePlayer(runtime, battle) {
  return runtime?.player?.party?.[Number(battle?.player_party_index ?? 0)] ?? null;
}

function prepareMetronomeRound(runtime) {
  const battle = stateOf(runtime).battle;
  if (!battle || battle.completed) throw new Error("active battle is required");
  const player = activePlayer(runtime, battle);
  if (!player) throw new Error("active player Pokemon is required");
  injectMetronomeBattleStateCanonical(player, battle, "player");
  injectMetronomeBattleStateCanonical(battle.foe, battle, "foe");
  return {
    battle,
    player: structuredClone(player),
    foe: structuredClone(battle.foe),
  };
}

function clearTransientFromParty(party) {
  if (!Array.isArray(party)) return;
  for (const pokemon of party) clearMetronomePokemonTransientCanonical(pokemon);
}

function cleanupMetronomeTransients(runtime, result = null) {
  const battle = stateOf(runtime).battle;
  clearTransientFromParty(runtime?.player?.party);
  clearTransientFromParty(battle?.trainer_party);
  clearMetronomePokemonTransientCanonical(battle?.foe);
  clearMetronomePokemonTransientCanonical(result?.player);
  clearMetronomePokemonTransientCanonical(result?.foe);
  clearTransientFromParty(result?.nextRoundState?.playerParty);
  clearTransientFromParty(result?.nextRoundState?.foeParty);
  clearTransientFromParty(result?.battleContinuationHandoff?.playerParty);
  clearTransientFromParty(result?.battleContinuationHandoff?.foeParty);
}

function updateMetronomeAfterRound(runtime, before, result, playerUsedMove) {
  const battle = stateOf(runtime).battle;
  updateMetronomeBattleStateAfterResolvedRoundCanonical({
    battle,
    side: "player",
    pokemonBefore: before.player,
    resolved: result,
    battlerIndex: 0,
    usedMove: playerUsedMove,
  });
  updateMetronomeBattleStateAfterResolvedRoundCanonical({
    battle,
    side: "foe",
    pokemonBefore: before.foe,
    resolved: result,
    battlerIndex: 1,
    usedMove: true,
  });
  if (result?.playerReplacementApplied) clearMetronomeBattleStateCanonical(battle, "player");
  if (result?.foeReplacementApplied) clearMetronomeBattleStateCanonical(battle, "foe");
  cleanupMetronomeTransients(runtime, result);
}

export function resolveSafariNormalBattleRound(runtime, selectedMoveId) {
  const before = prepareMetronomeRound(runtime);
  let result;
  try {
    result = resolveSafariNormalBattleRoundBase(runtime, selectedMoveId);
    updateMetronomeAfterRound(runtime, before, result, true);
    return result;
  } finally {
    cleanupMetronomeTransients(runtime, result);
  }
}

export function resolveSafariNormalBattleOpponentResponse(runtime) {
  const before = prepareMetronomeRound(runtime);
  let result;
  try {
    result = resolveSafariNormalBattleOpponentResponseBase(runtime);
    updateMetronomeAfterRound(runtime, before, result, false);
    return result;
  } finally {
    cleanupMetronomeTransients(runtime, result);
  }
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
    if (battle) clearMetronomeBattleStateCanonical(battle, "player");
  }
  cleanupMetronomeTransients(runtime, result);
  return result;
}
