export * from "./safari-normal-battle-round-pre-gems.js";

import {
  resolveSafariNormalBattleOpponentResponse as resolveSafariNormalBattleOpponentResponseBase,
  resolveSafariNormalBattleRound as resolveSafariNormalBattleRoundBase,
} from "./safari-normal-battle-round-pre-gems.js";
import { consumeHeldGemCanonical } from "./item-held-gem-effects.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function resolvedActions(result) {
  return result?.battleRuntimeIntegration?.combatTrace?.rounds?.[0]?.actions ?? [];
}

function gemHitActionForBattler(result, battlerIndex) {
  const index = Number(battlerIndex);
  return resolvedActions(result).find((action) => {
    if (action?.kind !== "move" || Number(action?.battlerIndex) !== index) return false;
    if (action?.moveSkipped === true || action?.lastMoveFailed === true) return false;
    const gem = action?.abilityItemActionBefore?.userGem;
    if (gem?.triggered !== true) return false;
    const hpBefore = Number(action?.hpBefore);
    const hpAfter = Number(action?.hpAfter);
    return Number.isFinite(hpBefore) && Number.isFinite(hpAfter) && hpAfter < hpBefore;
  }) ?? null;
}

function commitGemOntoPokemon(current, action) {
  const consumed = consumeHeldGemCanonical(current, action?.abilityItemActionBefore?.userGem ?? null);
  return consumed.consumed ? consumed : null;
}

function applyGemConsumption(runtime, before, result) {
  const battle = stateOf(runtime).battle;
  let playerConsumed = null;
  let foeConsumed = null;

  if (!result?.playerReplacementApplied) {
    const action = gemHitActionForBattler(result, 0);
    const partyIndex = Number(before.playerPartyIndex);
    const current = runtime?.player?.party?.[partyIndex];
    if (action && current) {
      playerConsumed = commitGemOntoPokemon(current, action);
      if (playerConsumed) runtime.player.party[partyIndex] = structuredClone(playerConsumed.pokemon);
    }
  }

  if (!result?.foeReplacementApplied) {
    const action = gemHitActionForBattler(result, 1);
    if (action && battle?.foe) {
      foeConsumed = commitGemOntoPokemon(battle.foe, action);
      if (foeConsumed) {
        battle.foe = structuredClone(foeConsumed.pokemon);
        if (battle.kind === "trainer" && Array.isArray(battle.trainer_party)) {
          const foeIndex = Number(before.foePartyIndex);
          if (battle.trainer_party[foeIndex]) battle.trainer_party[foeIndex] = structuredClone(battle.foe);
        }
      }
    }
  }

  if (!playerConsumed && !foeConsumed) return result;
  return {
    ...result,
    ...(runtime?.player?.party?.[Number(before.playerPartyIndex)]
      ? { player: structuredClone(runtime.player.party[Number(before.playerPartyIndex)]) }
      : {}),
    ...(battle?.foe ? { foe: structuredClone(battle.foe) } : {}),
    heldGemConsumption: Object.freeze({
      player: playerConsumed ? Object.freeze({ item: playerConsumed.item, consumed: true }) : null,
      foe: foeConsumed ? Object.freeze({ item: foeConsumed.item, consumed: true }) : null,
    }),
  };
}

function prepare(runtime) {
  const battle = stateOf(runtime).battle;
  if (!battle || battle.completed) throw new Error("active battle is required");
  return Object.freeze({
    playerPartyIndex: Number(battle.player_party_index ?? 0),
    foePartyIndex: Number(battle.trainer_party_index ?? 0),
  });
}

export function resolveSafariNormalBattleRound(runtime, selectedMoveId) {
  const before = prepare(runtime);
  return applyGemConsumption(runtime, before, resolveSafariNormalBattleRoundBase(runtime, selectedMoveId));
}

export function resolveSafariNormalBattleOpponentResponse(runtime) {
  const before = prepare(runtime);
  return applyGemConsumption(runtime, before, resolveSafariNormalBattleOpponentResponseBase(runtime));
}

export function resolveSafariNormalWildOpponentResponse(runtime) {
  const battle = stateOf(runtime).battle;
  if (!battle || battle.completed || battle.kind !== "wild") throw new Error("active wild battle is required");
  return resolveSafariNormalBattleOpponentResponse(runtime);
}
