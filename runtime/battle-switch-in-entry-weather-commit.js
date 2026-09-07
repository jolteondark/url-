import { resolveBattleAbilityItemHookCanonical } from "./battle-ability-item-hook-dispatch.js";
import { commitBattleWeatherRequestCanonical } from "./battle-weather-environment-state.js";

export function commitSwitchInEntryWeatherCanonical({ battle, pokemon } = {}) {
  if (!pokemon || !battle || battle.completed) return null;
  const resolved = resolveBattleAbilityItemHookCanonical({
    hook: "switch_in",
    user: pokemon,
    context: {
      weather: battle.battle_weather_state?.weather ?? null,
    },
  });
  const entryWeather = resolved?.entryWeather ?? null;
  if (entryWeather?.weatherRequest) {
    battle.battle_weather_state = commitBattleWeatherRequestCanonical(
      battle.battle_weather_state ?? null,
      entryWeather.weatherRequest,
    );
  }
  return entryWeather;
}
