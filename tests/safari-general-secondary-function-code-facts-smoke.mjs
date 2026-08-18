import assert from "node:assert/strict";
import {
  SAFARI_GENERAL_SECONDARY_FUNCTION_CODE_METADATA_V108,
  projectSafariGeneralSecondaryFunctionCodeV108,
  safariGeneralSecondaryFunctionCodeV108,
} from "../runtime/safari-general-move-secondary-function-facts.js";

assert.equal(SAFARI_GENERAL_SECONDARY_FUNCTION_CODE_METADATA_V108.moveCount, 140);
assert.equal(SAFARI_GENERAL_SECONDARY_FUNCTION_CODE_METADATA_V108.uniqueFunctionCodeCount, 53);
assert.equal(
  SAFARI_GENERAL_SECONDARY_FUNCTION_CODE_METADATA_V108.projectionSha256,
  "ba95fb2ff38a68687677f920ac5d64b3a197a3a32ebc6da6496f851ad3fd56b7",
);
assert.equal(safariGeneralSecondaryFunctionCodeV108("BITE"), "FlinchTarget");
assert.equal(safariGeneralSecondaryFunctionCodeV108("THUNDERSHOCK"), "ParalyzeTarget");
assert.equal(safariGeneralSecondaryFunctionCodeV108("FIREFANG"), "BurnFlinchTarget");
assert.equal(safariGeneralSecondaryFunctionCodeV108("CHARGEBEAM"), "RaiseUserSpAtk1");
assert.throws(() => safariGeneralSecondaryFunctionCodeV108("TACKLE"), RangeError);

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
assert.equal(tackle.function_code, undefined);
assert.throws(
  () => projectSafariGeneralSecondaryFunctionCodeV108("BITE", { id: "BITE", effect_chance: 30, function_code: "None" }),
  /FunctionCode mismatch/,
);

console.log("Safari GENERAL secondary FunctionCode facts: PASS");
