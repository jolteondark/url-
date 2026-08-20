import assert from "node:assert/strict";
import {
  BATTLE_ENTRY_WEATHER_COVERAGE_CANONICAL,
  resolveEntryWeatherAbilityItemHookCanonical,
} from "../runtime/battle-core-entry-weather-extension.js";
import {
  BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL,
  resolveBattleAbilityItemHookCanonical,
} from "../runtime/battle-ability-item-hook-dispatch.js";

const pokemon = (ability, heldItem = null) => ({
  ability,
  held_item: heldItem,
  item: heldItem,
  hp: 100,
  max_hp: 100,
});

const drizzle = resolveEntryWeatherAbilityItemHookCanonical({ user: pokemon("DRIZZLE") });
assert.equal(drizzle.triggered, true);
assert.deepEqual(drizzle.weatherRequest, {
  weather: "Rain",
  duration: 5,
  source: "ability",
  ability: "DRIZZLE",
});

const dampRock = resolveEntryWeatherAbilityItemHookCanonical({ user: pokemon("DRIZZLE", "DAMPROCK") });
assert.equal(dampRock.weatherRequest.duration, 8);

assert.equal(resolveEntryWeatherAbilityItemHookCanonical({ user: pokemon("DROUGHT") }).weatherRequest.weather, "Sun");
assert.equal(resolveEntryWeatherAbilityItemHookCanonical({ user: pokemon("SANDSTREAM") }).weatherRequest.weather, "Sandstorm");
assert.equal(resolveEntryWeatherAbilityItemHookCanonical({ user: pokemon("SNOWWARNING") }).weatherRequest.weather, "Snow");
assert.equal(resolveEntryWeatherAbilityItemHookCanonical({ user: pokemon("DROUGHT", "HEATROCK") }).weatherRequest.duration, 8);
assert.equal(resolveEntryWeatherAbilityItemHookCanonical({ user: pokemon("SANDSTREAM", "SMOOTHROCK") }).weatherRequest.duration, 8);
assert.equal(resolveEntryWeatherAbilityItemHookCanonical({ user: pokemon("SNOWWARNING", "ICYROCK") }).weatherRequest.duration, 8);

const blocked = resolveEntryWeatherAbilityItemHookCanonical({
  user: pokemon("DRIZZLE", "DAMPROCK"),
  context: { effectiveWeather: "HarshSun" },
});
assert.equal(blocked.triggered, false);
assert.equal(blocked.reason, "extreme_weather");
assert.equal(blocked.weatherRequest, null);

const staleRock = resolveEntryWeatherAbilityItemHookCanonical({
  user: { ability: "DRIZZLE", held_item: null, item: "DAMPROCK" },
});
assert.equal(staleRock.weatherRequest.duration, 5);

const legacyRock = resolveEntryWeatherAbilityItemHookCanonical({
  user: { ability_id: "DRIZZLE", item: "DAMPROCK" },
});
assert.equal(legacyRock.weatherRequest.duration, 8);

const shared = resolveBattleAbilityItemHookCanonical({
  hook: "switch_in",
  user: pokemon("SANDSTREAM", "SMOOTHROCK"),
  target: pokemon("NONE"),
});
assert.equal(shared.entryWeather.triggered, true);
assert.equal(shared.entryWeather.weatherRequest.weather, "Sandstorm");
assert.equal(shared.entryWeather.weatherRequest.duration, 8);

assert.deepEqual(BATTLE_ENTRY_WEATHER_COVERAGE_CANONICAL.abilityIds, [
  "DRIZZLE", "DROUGHT", "SANDSTREAM", "SNOWWARNING",
]);
assert.deepEqual(BATTLE_ENTRY_WEATHER_COVERAGE_CANONICAL.itemIds, [
  "DAMPROCK", "HEATROCK", "ICYROCK", "SMOOTHROCK",
]);
for (const id of BATTLE_ENTRY_WEATHER_COVERAGE_CANONICAL.abilityIds) {
  assert.ok(BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL.abilityIds.includes(id));
}
for (const id of BATTLE_ENTRY_WEATHER_COVERAGE_CANONICAL.itemIds) {
  assert.ok(BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL.itemIds.includes(id));
}
assert.equal(BATTLE_ENTRY_WEATHER_COVERAGE_CANONICAL.classificationCounts.entryWeatherAbilities, 4);
assert.equal(BATTLE_ENTRY_WEATHER_COVERAGE_CANONICAL.classificationCounts.weatherDurationHeldItems, 4);

console.log("battle ability/item entry weather smoke: PASS");
