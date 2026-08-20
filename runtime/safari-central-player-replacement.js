import { resolveBrowserPlayerReplacementContinuation } from "./browser-player-replacement-continuation.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

export function prepareSafariNormalPlayerReplacement(runtime, replacementPartyIndex) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle || battle.completed) throw new Error("active battle is required");
  if (battle.origin === "boundary_trial") throw new Error("boundary battle must use the boundary owner");
  if (!battle.player_replacement_required || !battle.player_replacement_handoff) {
    throw new Error("player replacement is not required");
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
      result: "rejected",
      ownerResult: continuation.result,
      replacementOptions: structuredClone(battle.player_replacement_options ?? []),
      operations: structuredClone(continuation.operations ?? []),
      playerReplacementContinuation: continuation,
      playerReplacementRequired: true,
      playerReplacementApplied: false,
      persistenceRequested: false,
    };
  }

  return {
    runtime,
    result: "replacement_selected",
    replacementPartyIndex: Number(continuation.battleContinuationHandoff.playerActivePartyIndex),
    activePlayer: structuredClone(continuation.activePlayer),
    operations: structuredClone(continuation.operations ?? []),
    playerReplacementContinuation: continuation,
    playerReplacementRequired: true,
    playerReplacementApplied: false,
    persistenceRequested: false,
  };
}
