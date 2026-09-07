export * from "./safari-playable-integration-boundary.js";

import * as base from "./safari-playable-integration-boundary.js";
import { commitSwitchInEntryWeatherCanonical } from "./battle-switch-in-entry-weather-commit.js";

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TypeError("runtime variables.mapless state is required");
  return state;
}

function commitFoeReplacementEntryWeather(runtime, result) {
  const battle = stateOf(runtime).battle;
  if (!result?.foeReplacementApplied || battle?.origin !== "boundary_trial" || !battle?.foe) return result;
  const entryWeather = commitSwitchInEntryWeatherCanonical({ battle, pokemon: battle.foe });
  if (!entryWeather?.triggered) return result;
  return {
    ...result,
    battleWeatherState: structuredClone(battle.battle_weather_state ?? null),
    foeEntryWeather: structuredClone(entryWeather),
  };
}

export function resolveSafariBattleRound(runtime, selectedMoveId) {
  return commitFoeReplacementEntryWeather(runtime, base.resolveSafariBattleRound(runtime, selectedMoveId));
}

export function useSafariBoundaryBattleItem(runtime, options = {}) {
  const result = base.useSafariBoundaryBattleItem(runtime, options);
  const opponentResponse = commitFoeReplacementEntryWeather(runtime, result?.opponentResponse);
  if (opponentResponse === result?.opponentResponse) return result;
  return {
    ...result,
    opponentResponse,
    battleWeatherState: structuredClone(opponentResponse?.battleWeatherState ?? stateOf(runtime).battle?.battle_weather_state ?? null),
    foeEntryWeather: structuredClone(opponentResponse?.foeEntryWeather ?? null),
  };
}

export function resolveSafariBoundaryPlayerReplacement(runtime, replacementPartyIndex = null, options = {}) {
  const result = base.resolveSafariBoundaryPlayerReplacement(runtime, replacementPartyIndex, options);
  if (!result?.playerReplacementApplied || result?.result !== "continued_with_replacement") return result;
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
