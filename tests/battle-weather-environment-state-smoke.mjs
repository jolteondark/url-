import assert from "node:assert/strict";
import {
  advanceBattleWeatherEnvironmentEndOfRoundCanonical,
  commitBattleWeatherRequestCanonical,
  commitResolvedMoveWeatherCanonical,
  createBattleWeatherEnvironmentState,
  effectiveBattleWeatherCanonical,
  injectLiveBattleWeatherIntoActionCanonical,
} from "../runtime/battle-weather-environment-state.js";

let weather = createBattleWeatherEnvironmentState();
assert.deepEqual(weather, { weather: null, turns: 0 });

weather = commitResolvedMoveWeatherCanonical(weather, {
  kind: "move",
  functionCode: "StartRainWeather",
  moveSkipped: false,
  lastMoveFailed: false,
});
assert.deepEqual(weather, { weather: "Rain", turns: 5 });

const slowerAction = injectLiveBattleWeatherIntoActionCanonical({
  kind: "move",
  damageInput: { damageMultiplierInput: { type: "WATER" } },
  accuracyInput: { accuracyModifierInput: {} },
}, weather, [{ ability: "NONE" }, { ability: "NONE" }]);
assert.equal(slowerAction.damageInput.damageMultiplierInput.effectiveWeather, "Rain");
assert.equal(slowerAction.accuracyInput.accuracyModifierInput.effectiveWeather, "Rain");

assert.equal(effectiveBattleWeatherCanonical(weather, [{ ability: "CLOUDNINE" }]), null);
assert.equal(injectLiveBattleWeatherIntoActionCanonical(slowerAction, weather, [{ ability: "AIRLOCK" }]).effectiveWeather, null);
assert.deepEqual(weather, { weather: "Rain", turns: 5 }, "suppression must not mutate raw weather");

weather = advanceBattleWeatherEnvironmentEndOfRoundCanonical(weather);
assert.deepEqual(weather, { weather: "Rain", turns: 4 });

weather = commitBattleWeatherRequestCanonical(weather, { weather: "Sun", duration: 5 });
assert.deepEqual(weather, { weather: "Sun", turns: 5 }, "entry weather requests must use the same raw owner");

const failedRainDance = commitResolvedMoveWeatherCanonical(weather, {
  kind: "move",
  functionCode: "StartRainWeather",
  lastMoveFailed: true,
});
assert.deepEqual(failedRainDance, weather, "failed moves must not commit weather");

console.log("battle weather environment state smoke: ok");
