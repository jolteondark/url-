export * from "./safari-normal-battle-round-pre-gems.js";

import {
  resolveSafariNormalBattleOpponentResponse as resolveSafariNormalBattleOpponentResponseBase,
  resolveSafariNormalBattlePlayerReplacement as resolveSafariNormalBattlePlayerReplacementBase,
  resolveSafariNormalBattleRound as resolveSafariNormalBattleRoundBase,
} from "./safari-normal-battle-round-pre-gems.js";
import { commitSwitchInEntryWeatherCanonical } from "./battle-switch-in-entry-weather-commit.js";
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

function applyCommittedFoeEntryWeather(runtime, result) {
  const battle = stateOf(runtime).battle;
  if (!result?.foeReplacementApplied || battle?.kind !== "trainer" || !battle?.foe) return result;
  const entryWeather = commitSwitchInEntryWeatherCanonical({ battle, pokemon: battle.foe });
  if (!entryWeather?.triggered) return result;
  return {
    ...result,
    battleWeatherState: structuredClone(battle.battle_weather_state ?? null),
    foeEntryWeather: structuredClone(entryWeather),
  };
}

function applyGemConsumption(runtime, before, result) {
  const battle = stateOf(runtime).battle;
  let playerConsumed = null;
  let foeConsumed = null;

  const playerAction = gemHitActionForBattler(result, 0);
  const playerPartyIndex = Number(before.playerPartyIndex);
  const playerAtAction = runtime?.player?.party?.[playerPartyIndex];
  if (playerAction && playerAtAction) {
    playerConsumed = commitGemOntoPokemon(playerAtAction, playerAction);
    if (playerConsumed) runtime.player.party[playerPartyIndex] = structuredClone(playerConsumed.pokemon);
  }

  const foeAction = gemHitActionForBattler(result, 1);
  const foePartyIndex = Number(before.foePartyIndex);
  const trainerParty = battle?.kind === "trainer" && Array.isArray(battle?.trainer_party)
    ? battle.trainer_party
    : null;
  const foeAtAction = trainerParty?.[foePartyIndex] ?? battle?.foe ?? null;
  if (foeAction && foeAtAction) {
    foeConsumed = commitGemOntoPokemon(foeAtAction, foeAction);
    if (foeConsumed) {
      if (trainerParty?.[foePartyIndex]) trainerParty[foePartyIndex] = structuredClone(foeConsumed.pokemon);
      if (!result?.foeReplacementApplied && battle?.foe) battle.foe = structuredClone(foeConsumed.pokemon);
    }
  }

  if (!playerConsumed && !foeConsumed) return result;
  return {
    ...result,
    ...(!result?.playerReplacementApplied && runtime?.player?.party?.[playerPartyIndex]
      ? { player: structuredClone(runtime.player.party[playerPartyIndex]) }
      : {}),
    ...(!result?.foeReplacementApplied && battle?.foe ? { foe: structuredClone(battle.foe) } : {}),
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
  const resolved = applyCommittedFoeEntryWeather(runtime, resolveSafariNormalBattleRoundBase(runtime, selectedMoveId));
  return applyGemConsumption(runtime, before, resolved);
}

export function resolveSafariNormalBattleOpponentResponse(runtime) {
  const before = prepare(runtime);
  const resolved = applyCommittedFoeEntryWeather(runtime, resolveSafariNormalBattleOpponentResponseBase(runtime));
  return applyGemConsumption(runtime, before, resolved);
}

export function resolveSafariNormalWildOpponentResponse(runtime) {
  const battle = stateOf(runtime).battle;
  if (!battle || battle.completed || battle.kind !== "wild") throw new Error("active wild battle is required");
  return resolveSafariNormalBattleOpponentResponse(runtime);
}

export function resolveSafariNormalBattlePlayerReplacement(runtime, replacementPartyIndex) {
  const result = resolveSafariNormalBattlePlayerReplacementBase(runtime, replacementPartyIndex);
  if (result?.result !== "replaced") return result;
  const battle = stateOf(runtime).battle;
  const active = runtime?.player?.party?.[Number(battle?.player_party_index ?? -1)] ?? null;
  const entryWeather = commitSwitchInEntryWeatherCanonical({ battle, pokemon: active });
  if (!entryWeather?.triggered) return result;
  return {
    ...result,
    battleWeatherState: structuredClone(battle.battle_weather_state ?? null),
    playerEntryWeather: structuredClone(entryWeather),
  };
}
