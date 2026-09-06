import assert from "node:assert/strict";
import {
  advanceBattleWeatherEnvironmentEndOfRoundCanonical,
  commitResolvedMoveWeatherCanonical,
  createBattleWeatherEnvironmentState,
  effectiveBattleWeatherCanonical,
  injectLiveBattleWeatherIntoActionCanonical,
} from "../runtime/battle-weather-environment-state.js";

// Misty vertical: Poliwag establishes rain, Psyduck suppresses only its effective
// application, and removing Cloud Nine reveals the still-live raw rain again.
let weather = createBattleWeatherEnvironmentState();
const poliwagRainDance = {
  kind: "move",
  functionCode: "StartRainWeather",
  moveSkipped: false,
  lastMoveFailed: false,
};
weather = commitResolvedMoveWeatherCanonical(weather, poliwagRainDance);
assert.deepEqual(weather, { weather: "Rain", turns: 5 });

const laterWaterAction = {
  kind: "move",
  damageInput: { damageMultiplierInput: { type: "WATER" } },
  accuracyInput: { accuracyModifierInput: {} },
};
const sameRoundInRain = injectLiveBattleWeatherIntoActionCanonical(
  laterWaterAction,
  weather,
  [{ ability: "NONE" }, { ability: "NONE" }],
);
assert.equal(sameRoundInRain.effectiveWeather, "Rain");
assert.equal(sameRoundInRain.damageInput.damageMultiplierInput.effectiveWeather, "Rain");

weather = advanceBattleWeatherEnvironmentEndOfRoundCanonical(weather);
assert.deepEqual(weather, { weather: "Rain", turns: 4 });
assert.equal(effectiveBattleWeatherCanonical(weather, [{ ability: "NONE" }]), "Rain");

const psyduckCloudNine = [{ ability: "CLOUDNINE" }, { ability: "NONE" }];
assert.equal(effectiveBattleWeatherCanonical(weather, psyduckCloudNine), null);
const suppressedAction = injectLiveBattleWeatherIntoActionCanonical(laterWaterAction, weather, psyduckCloudNine);
assert.equal(suppressedAction.effectiveWeather, null);
assert.deepEqual(weather, { weather: "Rain", turns: 4 });

// Cloud Nine leaving the active field must not have deleted or restarted raw rain.
assert.equal(effectiveBattleWeatherCanonical(weather, [{ ability: "NONE" }, { ability: "NONE" }]), "Rain");
const restoredAction = injectLiveBattleWeatherIntoActionCanonical(
  laterWaterAction,
  weather,
  [{ ability: "NONE" }, { ability: "NONE" }],
);
assert.equal(restoredAction.effectiveWeather, "Rain");
assert.equal(restoredAction.damageInput.damageMultiplierInput.effectiveWeather, "Rain");
assert.deepEqual(weather, { weather: "Rain", turns: 4 });

console.log("battle weather Misty vertical smoke: ok");
