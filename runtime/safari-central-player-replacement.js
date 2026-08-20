import { resolveBrowserPlayerReplacementContinuation } from "./browser-player-replacement-continuation.js";
import { createBattleStatStageStateCanonical, resetBattleStatStagesForBattlerCanonical } from "./battle-core-stat-stages.js";

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

export function commitSafariNormalPlayerReplacement(runtime, current) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle || battle.completed) throw new Error("active battle is required");
  if (battle.origin === "boundary_trial") throw new Error("boundary battle must use the boundary owner");
  if (!battle.player_replacement_required || !battle.player_replacement_handoff) {
    throw new Error("player replacement is not required");
  }

  const continuation = current?.playerReplacementContinuation;
  if (continuation?.result !== "continued_with_replacement") {
    throw new Error("prepared player replacement continuation is required");
  }
  const handoff = continuation.battleContinuationHandoff;
  runtime.player.party = structuredClone(handoff.playerParty);
  battle.player_party_index = Number(handoff.playerActivePartyIndex);
  battle.player_party_order = structuredClone(continuation.partyOrder ?? battle.player_party_order ?? null);
  battle.stat_stages = resetBattleStatStagesForBattlerCanonical(
    createBattleStatStageStateCanonical(battle.stat_stages),
    0,
  );
  battle.player_replacement_required = false;
  battle.player_replacement_options = [];
  battle.player_replacement_handoff = null;
  battle.last_operations = [...(battle.last_operations ?? []), ...(continuation.operations ?? [])];
  state.last_operations = structuredClone(continuation.operations ?? []);
  state.notice = `${continuation.activePlayer?.species ?? "次のポケモン"}に交代した！`;

  return {
    ...current,
    runtime,
    result: "replaced",
    replacementPartyIndex: Number(handoff.playerActivePartyIndex),
    activePlayer: structuredClone(continuation.activePlayer),
    operations: structuredClone(continuation.operations ?? []),
    playerReplacementRequired: false,
    playerReplacementApplied: true,
    persistenceRequested: false,
  };
}
