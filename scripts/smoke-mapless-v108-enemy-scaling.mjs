import assert from "node:assert/strict";
import {
  resolveMaplessV108AllowedEvolutionStages,
  resolveMaplessV108DayScalingValue,
  resolveMaplessV108EffectiveScalingValue,
  resolveMaplessV108ScaledEnemyLevel,
  resolveMaplessV108ScalingBaseLevel,
} from "../runtime/mapless-v108-enemy-scaling.js";

assert.equal(resolveMaplessV108DayScalingValue(1), 0);
assert.equal(resolveMaplessV108DayScalingValue(5), 0);
assert.equal(resolveMaplessV108DayScalingValue(6), 1);
assert.equal(resolveMaplessV108DayScalingValue(10), 1);
assert.equal(resolveMaplessV108DayScalingValue(11), 2);

assert.equal(resolveMaplessV108EffectiveScalingValue(1, "WEAK"), 0);
assert.equal(resolveMaplessV108EffectiveScalingValue(6, "STRONG"), 3);
assert.equal(resolveMaplessV108EffectiveScalingValue(6, "VERY_STRONG", 2), 7);

assert.equal(resolveMaplessV108ScalingBaseLevel(0), 3);
assert.equal(resolveMaplessV108ScalingBaseLevel(6), 15);
assert.equal(resolveMaplessV108ScalingBaseLevel(7), 17);
assert.equal(resolveMaplessV108ScalingBaseLevel(11), 25);
assert.equal(resolveMaplessV108ScalingBaseLevel(17), 37);
assert.equal(resolveMaplessV108ScalingBaseLevel(999), 100);

assert.deepEqual(resolveMaplessV108AllowedEvolutionStages(6), [
  "NO_EVOLUTION", "ONE_EVOLUTION_BASE", "TWO_EVOLUTION_BASE",
]);
assert.deepEqual(resolveMaplessV108AllowedEvolutionStages(7), [
  "NO_EVOLUTION", "ONE_EVOLUTION_BASE", "TWO_EVOLUTION_MIDDLE",
]);
assert.deepEqual(resolveMaplessV108AllowedEvolutionStages(11), [
  "NO_EVOLUTION", "ONE_EVOLUTION_FINAL", "TWO_EVOLUTION_MIDDLE",
]);
assert.deepEqual(resolveMaplessV108AllowedEvolutionStages(17), [
  "NO_EVOLUTION", "ONE_EVOLUTION_FINAL", "TWO_EVOLUTION_FINAL",
]);

let draws = 0;
assert.equal(resolveMaplessV108ScaledEnemyLevel({
  day: 6, rank: "NORMAL", useVariance: false,
  randomInt: () => { draws += 1; return 2; },
}), 5);
assert.equal(draws, 0);

for (const [index, expected] of [[0, 4], [1, 5], [2, 6]]) {
  assert.equal(resolveMaplessV108ScaledEnemyLevel({
    day: 6,
    rank: "NORMAL",
    useVariance: true,
    randomInt: (max) => {
      assert.equal(max, 3);
      return index;
    },
  }), expected);
}

assert.equal(resolveMaplessV108ScaledEnemyLevel({ day: 6 }), null);
assert.equal(resolveMaplessV108DayScalingValue(0), null);
assert.equal(resolveMaplessV108EffectiveScalingValue(1, "S"), null);

console.log("mapless-v108-enemy-scaling smoke: PASS");
