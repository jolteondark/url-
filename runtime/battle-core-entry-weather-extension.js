import {
  battlePokemonAbilityIdCanonical,
  battlePokemonHeldItemIdCanonical,
} from "./battle-core-ability-item-modifiers.js";

const ENTRY_WEATHER = Object.freeze({
  DRIZZLE: Object.freeze({ weather: "Rain", rock: "DAMPROCK" }),
  DROUGHT: Object.freeze({ weather: "Sun", rock: "HEATROCK" }),
  SANDSTREAM: Object.freeze({ weather: "Sandstorm", rock: "SMOOTHROCK" }),
  SNOWWARNING: Object.freeze({ weather: "Snow", rock: "ICYROCK" }),
});

const EXTREME_WEATHER = new Set(["HeavyRain", "HarshSun", "StrongWinds"]);

export function resolveEntryWeatherAbilityItemHookCanonical({ user = {}, context = {} } = {}) {
  const ability = battlePokemonAbilityIdCanonical(user);
  const item = battlePokemonHeldItemIdCanonical(user);
  const weatherEffect = ENTRY_WEATHER[ability] ?? null;
  if (!weatherEffect) {
    return Object.freeze({
      boundary: "switch_in",
      ability,
      item,
      triggered: false,
      reason: "no_entry_weather",
      weatherRequest: null,
    });
  }

  const currentWeather = String(context?.effectiveWeather ?? context?.weather ?? "");
  if (EXTREME_WEATHER.has(currentWeather)) {
    return Object.freeze({
      boundary: "switch_in",
      ability,
      item,
      triggered: false,
      reason: "extreme_weather",
      weatherRequest: null,
    });
  }

  const duration = item === weatherEffect.rock ? 8 : 5;
  return Object.freeze({
    boundary: "switch_in",
    ability,
    item,
    triggered: true,
    reason: "entry_weather",
    weatherRequest: Object.freeze({
      weather: weatherEffect.weather,
      duration,
      source: "ability",
      ability,
    }),
  });
}

export const BATTLE_ENTRY_WEATHER_COVERAGE_CANONICAL = Object.freeze({
  abilityIds: Object.freeze(Object.keys(ENTRY_WEATHER).sort()),
  itemIds: Object.freeze(Object.values(ENTRY_WEATHER).map(({ rock }) => rock).sort()),
  abilityCount: Object.keys(ENTRY_WEATHER).length,
  itemCount: Object.keys(ENTRY_WEATHER).length,
  classificationCounts: Object.freeze({
    entryWeatherAbilities: Object.keys(ENTRY_WEATHER).length,
    weatherDurationHeldItems: Object.keys(ENTRY_WEATHER).length,
  }),
});
