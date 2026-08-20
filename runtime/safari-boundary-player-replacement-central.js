import { resolveBrowserPlayerReplacementContinuation } from "./browser-player-replacement-continuation.js";
import {
  SAFARI_BATTLE_PHASE,
  completeSafariBattleReplacement,
} from "./safari-battle-orchestrator.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("runtime variables.mapless state is required");
  }
  return state;
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}

export function resolveSafariBoundaryPlayerReplacement(runtime, replacementPartyIndex = null) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (battle?.origin !== "boundary_trial" || battle.completed) {
    throw new Error("active boundary battle is required");
  }
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
      playerReplacementApplied: false,
      phase: battle.phase ?? SAFARI_BATTLE_PHASE.REPLACEMENT,
      phaseTrace: clone(battle.phase_trace ?? []),
    };
  }

  const operations = (continuation.operations ?? []).map((operation) => ({
    ...clone(operation),
    battleTurn: battle.turn,
  }));
  const selected = {
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

  if (battle.phase !== SAFARI_BATTLE_PHASE.REPLACEMENT) {
    throw new Error(`boundary player replacement requires central REPLACEMENT phase, got ${battle.phase ?? "unset"}`);
  }

  return completeSafariBattleReplacement(runtime, selected, {
    replacementCommit(current) {
      const handoff = continuation.battleContinuationHandoff;
      runtime.player.party = clone(handoff.playerParty);
      battle.player_party_index = Number(handoff.playerActivePartyIndex);
      battle.player_party_order = clone(continuation.partyOrder ?? battle.player_party_order ?? null);
      battle.player_replacement_required = false;
      battle.player_replacement_handoff = null;
      battle.last_operations = [...(battle.last_operations ?? []), ...operations];
      state.last_operations = clone(operations);
      return {
        ...current,
        runtime,
        result: "continued_with_replacement",
        playerReplacementRequired: false,
        playerReplacementApplied: true,
        activePlayer: clone(continuation.activePlayer),
        playerActivePartyIndex: battle.player_party_index,
        playerPartyOrder: clone(battle.player_party_order),
        operations: clone(operations),
      };
    },
  });
}
