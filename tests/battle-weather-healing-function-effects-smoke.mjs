import assert from "node:assert/strict";
import { resolveCanonicalHpFunctionEffect } from "../runtime/battle-core-hp-function-effects.js";

function heal(functionCode, effectiveWeather, actorHp = 1, actorMaxHp = 101) {
  return resolveCanonicalHpFunctionEffect({ functionCode, effectiveWeather, actorHp, actorMaxHp });
}

// Mapless v0.9.108 / Essentials MoveEffects_Healing:
// Moonlight/Morning Sun/Synthesis heal 2/3 in Sun/HarshSun, 1/2 in None/StrongWinds,
// and 1/4 under other weather. Ruby Float#round semantics are preserved.
for (const weather of ["Sun", "HarshSun", "SUN", "harsh_sun"]) {
  assert.equal(heal("HealUserDependingOnWeather", weather).heal, 67);
}
for (const weather of ["None", "StrongWinds", "strong_winds", undefined]) {
  assert.equal(heal("HealUserDependingOnWeather", weather).heal, 51);
}
for (const weather of ["Rain", "HeavyRain", "Sandstorm", "Hail", "Snow", "Fog"]) {
  assert.equal(heal("HealUserDependingOnWeather", weather).heal, 25);
}

// Healing still caps at missing HP.
assert.equal(heal("HealUserDependingOnWeather", "Sun", 90, 101).heal, 11);

// Shore Up is the sibling weather-heal FunctionCode: 2/3 in Sandstorm, otherwise 1/2.
assert.equal(heal("HealUserDependingOnSandstorm", "Sandstorm").heal, 67);
assert.equal(heal("HealUserDependingOnSandstorm", "Rain").heal, 51);
assert.equal(heal("HealUserDependingOnSandstorm", "None").heal, 51);

console.log(JSON.stringify({
  ok: true,
  family: "weather_dependent_healing",
  functionCodes: ["HealUserDependingOnWeather", "HealUserDependingOnSandstorm"],
}));
