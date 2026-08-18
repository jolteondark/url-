import assert from "node:assert/strict";
import {
  SAFARI_GENERAL_MOVE_EFFECT_CHANCE_METADATA_V108,
  projectSafariGeneralMoveEffectChanceV108,
  safariGeneralMoveEffectChanceV108,
} from "../runtime/safari-general-move-effect-chance-facts.js";

assert.equal(SAFARI_GENERAL_MOVE_EFFECT_CHANCE_METADATA_V108.moveCount, 608);
assert.equal(SAFARI_GENERAL_MOVE_EFFECT_CHANCE_METADATA_V108.nonzeroCount, 140);
assert.equal(
  SAFARI_GENERAL_MOVE_EFFECT_CHANCE_METADATA_V108.projectionSha256,
  "84775681731ed1975e1988936234ad5483b92b645165ff7e7166b071d34879c1",
);
assert.equal(safariGeneralMoveEffectChanceV108("BITE"), 30);
assert.equal(safariGeneralMoveEffectChanceV108("THUNDERSHOCK"), 10);
assert.equal(safariGeneralMoveEffectChanceV108("CHARGEBEAM"), 70);
assert.equal(safariGeneralMoveEffectChanceV108("TACKLE"), 0);
assert.equal(safariGeneralMoveEffectChanceV108("FIREFANG"), 101);
assert.throws(() => safariGeneralMoveEffectChanceV108("NOT_A_GENERAL_MOVE"), RangeError);

const bite = projectSafariGeneralMoveEffectChanceV108("BITE", {
  id: "BITE",
  category: "Physical",
  power: 60,
  accuracy: 100,
  total_pp: 25,
  priority: 0,
  type: "DARK",
});
assert.equal(bite.effect_chance, 30);
assert.equal(bite.power, 60);
assert.throws(
  () => projectSafariGeneralMoveEffectChanceV108("BITE", { id: "BITE", effect_chance: 10 }),
  /effect chance mismatch/,
);

console.log("Safari GENERAL move effect chance facts: PASS");
