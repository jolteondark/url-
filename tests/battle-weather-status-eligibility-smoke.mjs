import assert from "node:assert/strict";
import {
  BATTLE_WEATHER_STATUS_ELIGIBILITY_COVERAGE_CANONICAL,
  resolveWeatherStatusEligibilityCanonical,
} from "../runtime/battle-core-weather-status-eligibility-extension.js";

const pokemon = (ability = "NONE", extra = {}) => ({
  ability,
  held_item: null,
  status: "NONE",
  ...extra,
});

for (const status of ["PARALYSIS", "POISON", "BURN", "FROZEN", "SLEEP"]) {
  const result = resolveWeatherStatusEligibilityCanonical({
    target: pokemon("LEAFGUARD"),
    newStatus: status,
    context: { effectiveWeather: "Sun" },
  });
  assert.equal(result.blocked, true, `Leaf Guard should block ${status} in Sun`);
  assert.equal(result.reason, "leaf_guard_sun");
}

assert.equal(resolveWeatherStatusEligibilityCanonical({
  target: pokemon("LEAFGUARD"),
  newStatus: "BURN",
  context: { effectiveWeather: "HarshSun" },
}).blocked, true);

assert.equal(resolveWeatherStatusEligibilityCanonical({
  target: pokemon("LEAFGUARD"),
  newStatus: "BURN",
  context: { effectiveWeather: "Rain" },
}).blocked, false);

assert.equal(resolveWeatherStatusEligibilityCanonical({
  target: pokemon(null, { ability_id: "LEAFGUARD" }),
  newStatus: "POISON",
  context: { effectiveWeather: "Sun" },
}).blocked, false, "canonical null ability must suppress stale legacy alias");

assert.equal(resolveWeatherStatusEligibilityCanonical({
  target: { ability_id: "LEAFGUARD", held_item: null, status: "NONE" },
  newStatus: "POISON",
  context: { effectiveWeather: "Sun" },
}).blocked, true, "legacy object without canonical ability field may fall back to ability_id");

assert.deepEqual(BATTLE_WEATHER_STATUS_ELIGIBILITY_COVERAGE_CANONICAL.abilityIds, ["LEAFGUARD"]);
assert.equal(BATTLE_WEATHER_STATUS_ELIGIBILITY_COVERAGE_CANONICAL.classificationCounts.weatherStatusImmunityAbilities, 1);

console.log("battle weather status eligibility smoke: PASS");
