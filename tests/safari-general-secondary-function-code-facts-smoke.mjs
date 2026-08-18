import assert from "node:assert/strict";
import {
  SAFARI_GENERAL_SECONDARY_FUNCTION_CODE_METADATA_V108,
  projectSafariGeneralSecondaryFunctionCodeV108,
  safariGeneralSecondaryFunctionCodeV108,
} from "../runtime/safari-general-move-secondary-function-facts.js";

assert.equal(SAFARI_GENERAL_SECONDARY_FUNCTION_CODE_METADATA_V108.moveCount, 608);
assert.equal(SAFARI_GENERAL_SECONDARY_FUNCTION_CODE_METADATA_V108.uniqueFunctionCodeCount, 345);
assert.equal(
  SAFARI_GENERAL_SECONDARY_FUNCTION_CODE_METADATA_V108.projectionSha256,
  "5059325350a36ca4c78122f4b35e7c53e1927815b1a3fe14fda5280f178d88d8",
);
assert.equal(safariGeneralSecondaryFunctionCodeV108("BITE"), "FlinchTarget");
assert.equal(safariGeneralSecondaryFunctionCodeV108("THUNDERSHOCK"), "ParalyzeTarget");
assert.equal(safariGeneralSecondaryFunctionCodeV108("FIREFANG"), "BurnFlinchTarget");
assert.equal(safariGeneralSecondaryFunctionCodeV108("CHARGEBEAM"), "RaiseUserSpAtk1");
assert.equal(safariGeneralSecondaryFunctionCodeV108("TACKLE"), "None");
assert.equal(safariGeneralSecondaryFunctionCodeV108("SEISMICTOSS"), "FixedDamageUserLevel");
assert.equal(safariGeneralSecondaryFunctionCodeV108("NIGHTSHADE"), "FixedDamageUserLevel");
assert.throws(() => safariGeneralSecondaryFunctionCodeV108("NOT_A_GENERAL_MOVE"), RangeError);

const bite = projectSafariGeneralSecondaryFunctionCodeV108("BITE", {
  id: "BITE",
  effect_chance: 30,
  category: "Physical",
  power: 60,
});
assert.equal(bite.function_code, "FlinchTarget");
assert.equal(bite.effect_chance, 30);

const tackle = projectSafariGeneralSecondaryFunctionCodeV108("TACKLE", {
  id: "TACKLE",
  effect_chance: 0,
  category: "Physical",
  power: 40,
});
assert.equal(tackle.function_code, "None");

const fixed = projectSafariGeneralSecondaryFunctionCodeV108("SEISMICTOSS", {
  id: "SEISMICTOSS",
  effect_chance: 0,
  category: "Physical",
  power: 1,
});
assert.equal(fixed.function_code, "FixedDamageUserLevel");
assert.throws(
  () => projectSafariGeneralSecondaryFunctionCodeV108("BITE", { id: "BITE", effect_chance: 30, function_code: "None" }),
  /FunctionCode mismatch/,
);

console.log("Safari GENERAL FunctionCode facts: PASS");
