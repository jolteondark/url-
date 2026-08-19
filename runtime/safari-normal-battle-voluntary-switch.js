import { resolveSwitchFlow } from "./battle-switch-flow.js";
import { createBattleStatStageStateCanonical, resetBattleStatStagesForBattlerCanonical } from "./battle-core-stat-stages.js";
import {
  abortSafariBattleCommand,
  beginSafariBattleCommand,
  commitSafariBattleResolution,
} from "./safari-battle-orchestrator.js";
import { resolveSafariNormalBattleOpponentResponse } from "./safari-normal-battle-round.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("runtime variables.mapless state is required");
  }
  return state;
}

function normalizedPartyForSwitch(party, activePartyIndex) {
  const active = Number(activePartyIndex);
  if (!Array.isArray(party) || !Number.isInteger(active) || active < 0 || active >= party.length) {
    throw new RangeError("active Party index is out of range");
  }
  return party.map((pokemon, index) => ({
    ...(structuredClone(pokemon) ?? {}),
    fainted: Boolean(pokemon?.fainted || Number(pokemon?.hp ?? 0) <= 0),
    active: index === active,
  }));
}

function requestsSave(operations = []) {
  return operations.some((operation) => operation?.op === "request_save");
}

export function switchSafariNormalBattlePlayer(runtime, replacementPartyIndex, { switchFacts = null } = {}) {
  const state = stateOf(runtime);
  const battle = state.battle;
  if (!battle || battle.completed) throw new Error("active battle is required");
  if (battle.origin === "boundary_trial") throw new Error("boundary battle must use the boundary owner");
  if (battle.player_replacement_required) {
    throw new Error("forced player replacement must use the replacement owner");
  }

  beginSafariBattleCommand(runtime, "switch");
  try {
    const activePartyIndex = Number(battle.player_party_index ?? 0);
    const party = normalizedPartyForSwitch(runtime.player?.party, activePartyIndex);
    const replacement = Number(replacementPartyIndex);
    if (!Number.isInteger(replacement) || replacement < 0 || replacement >= party.length) {
      throw new RangeError("replacementPartyIndex out of range");
    }

    const resolvedSwitchFacts = {
      ...(battle.player_switch_facts ?? {}),
      ...(switchFacts ?? {}),
      fainted: false,
    };
    const switchResolution = resolveSwitchFlow({
      idxBattler: 0,
      idxParty: replacement,
      battlerPartyIndex: activePartyIndex,
      partyOrder: Array.isArray(battle.player_party_order)
        ? [...battle.player_party_order]
        : party.map((_, index) => index),
      party,
      battler: resolvedSwitchFacts,
      sideSize: 1,
      recalculateTurnOrder: false,
    });

    if (switchResolution.result !== "switched") {
      const rejected = {
        runtime,
        result: "rejected",
        turnConsumed: false,
        replacementPartyIndex: replacement,
        switchResolution,
        opponentResponse: null,
        operations: structuredClone(switchResolution.operations ?? []),
        presentation: [],
        persistenceRequested: false,
      };
      commitSafariBattleResolution(runtime, rejected, "switch");
      return rejected;
    }

    battle.player_party_index = Number(switchResolution.activePartyIndex);
    battle.player_party_order = structuredClone(switchResolution.partyOrder ?? battle.player_party_order ?? null);
    battle.stat_stages = resetBattleStatStagesForBattlerCanonical(
      createBattleStatStageStateCanonical(battle.stat_stages),
      0,
    );
    const switchOperations = structuredClone(switchResolution.operations ?? []);
    battle.last_operations = switchOperations;
    state.last_operations = switchOperations;
    state.notice = `${runtime.player.party[battle.player_party_index]?.species ?? "次のポケモン"}に交代した！`;

    const opponentResponse = resolveSafariNormalBattleOpponentResponse(runtime);
    const operations = [...switchOperations, ...(opponentResponse.operations ?? [])];
    battle.last_operations = operations;
    state.last_operations = operations;
    const result = {
      ...opponentResponse,
      runtime,
      result: "switched",
      turnConsumed: true,
      replacementPartyIndex: Number(battle.player_party_index),
      activePlayer: structuredClone(runtime.player.party[battle.player_party_index] ?? null),
      switchResolution,
      opponentResponse,
      operations,
      presentation: [...(opponentResponse.presentation ?? [])],
      persistenceRequested: requestsSave(operations),
    };
    commitSafariBattleResolution(runtime, result, "switch");
    return result;
  } catch (error) {
    abortSafariBattleCommand(runtime, `switch failed:${error?.message ?? error}`);
    throw error;
  }
}
