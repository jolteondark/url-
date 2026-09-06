import assert from "node:assert/strict";
import {
  advanceBattleWeatherEndOfRoundCanonical,
  applyEffectiveBattleWeatherToActionCanonical,
  applyResolvedBattleWeatherMoveCanonical,
  createBattleWeatherStateCanonical,
  effectiveBattleWeatherCanonical,
} from "../runtime/battle-core-weather.js";

const clear = createBattleWeatherStateCanonical();
assert.deepEqual(clear, { weather: null, turns: 0 });

const rainStarted = applyResolvedBattleWeatherMoveCanonical(clear, {
  kind: "move",
  functionCode: "StartRainWeather",
  moveSkipped: false,
  lastMoveFailed: false,
});
assert.deepEqual(rainStarted, { weather: "Rain", turns: 5 });
assert.equal(effectiveBattleWeatherCanonical(rainStarted, { userAbility: "NONE", targetAbility: "NONE" }), "Rain");
assert.equal(effectiveBattleWeatherCanonical(rainStarted, { userAbility: "CLOUDNINE", targetAbility: "NONE" }), null);
assert.equal(effectiveBattleWeatherCanonical(rainStarted, { userAbility: "NONE", targetAbility: "AIRLOCK" }), null);
assert.deepEqual(rainStarted, { weather: "Rain", turns: 5 }, "suppression must not delete raw weather");

const waterAction = applyEffectiveBattleWeatherToActionCanonical({
  kind: "move",
  actorAbility: "NONE",
  targetAbility: "NONE",
  damageInput: { damageMultiplierInput: { type: "WATER" } },
}, rainStarted);
assert.equal(waterAction.damageInput.damageMultiplierInput.effectiveWeather, "Rain");

const suppressedAction = applyEffectiveBattleWeatherToActionCanonical({
  kind: "move",
  actorAbility: "NONE",
  targetAbility: "CLOUDNINE",
  damageInput: { damageMultiplierInput: { type: "WATER" } },
}, rainStarted);
assert.equal(suppressedAction.damageInput.damageMultiplierInput.effectiveWeather, null);

assert.deepEqual(advanceBattleWeatherEndOfRoundCanonical(rainStarted), { weather: "Rain", turns: 4 });
let state = rainStarted;
for (let i = 0; i < 5; i += 1) state = advanceBattleWeatherEndOfRoundCanonical(state);
assert.deepEqual(state, { weather: null, turns: 0 });

console.log("Battle canonical weather owner smoke: ok");
