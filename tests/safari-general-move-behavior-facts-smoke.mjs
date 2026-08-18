import assert from "node:assert/strict";
import {
  SAFARI_GENERAL_MOVE_BEHAVIOR_METADATA,
  safariGeneralMoveBehaviorFacts,
} from "../runtime/safari-general-move-behavior-facts.js";
import {
  SAFARI_GENERAL_DATA_METADATA,
  SAFARI_GENERAL_MOVE_MASTERS,
} from "../runtime/safari-general-encounter-data-loader.js";

assert.equal(SAFARI_GENERAL_MOVE_BEHAVIOR_METADATA.moveCount, 608);
assert.equal(SAFARI_GENERAL_MOVE_BEHAVIOR_METADATA.functionCodeCount, 345);
assert.equal(
  SAFARI_GENERAL_MOVE_BEHAVIOR_METADATA.projectionSha256,
  "0dd3f6b5e871d40a9d564f70a621c29722d4af3875f4689d21e516fd09929d99",
);
assert.equal(
  SAFARI_GENERAL_DATA_METADATA.moveBehaviorFactsSha256,
  SAFARI_GENERAL_MOVE_BEHAVIOR_METADATA.projectionSha256,
);

const representatives = [
  ["ACIDSPRAY", 4, "LowerTargetSpDef2", 100],
  ["BITE", 47, "FlinchTarget", 30],
  ["BODYSLAM", 52, "ParalyzeTarget", 30],
  ["EMBER", 150, "BurnTarget", 10],
  ["FIREFANG", 176, "BurnFlinchTarget", 101],
  ["GROWL", 221, "LowerTargetAttack1", 0],
  ["TACKLE", 533, "None", 0],
];
for (const [id, index, functionCode, effectChance] of representatives) {
  assert.deepEqual(
    safariGeneralMoveBehaviorFacts(id, index),
    { function_code: functionCode, effect_chance: effectChance },
  );
  assert.equal(SAFARI_GENERAL_MOVE_MASTERS[id].function_code, functionCode);
  assert.equal(SAFARI_GENERAL_MOVE_MASTERS[id].effect_chance, effectChance);
}

const moveMasters = Object.values(SAFARI_GENERAL_MOVE_MASTERS);
assert.equal(moveMasters.length, 608);
assert.equal(moveMasters.filter((move) => move.effect_chance > 0).length, 140);
assert.equal(new Set(moveMasters.map((move) => move.function_code)).size, 345);
assert.deepEqual(
  [...new Set(moveMasters.map((move) => move.effect_chance))].sort((a, b) => a - b),
  [0, 10, 20, 30, 40, 50, 70, 100, 101],
);
assert.ok(moveMasters.every((move) => typeof move.function_code === "string" && move.function_code.length > 0));
assert.ok(moveMasters.every((move) => Number.isInteger(move.effect_chance) && move.effect_chance >= 0));

console.log("Safari GENERAL canonical move behavior facts smoke PASS");
