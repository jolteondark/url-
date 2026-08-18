import assert from "node:assert/strict";
import {
  SAFARI_CANONICAL_MOVE_FUNCTION_CODE_METADATA_V108,
  safariCanonicalMoveFunctionCodeV108,
} from "../runtime/safari-canonical-move-function-code-facts.js";
import {
  SAFARI_MOVE_MASTERS,
  installSafariGeneralMasters,
} from "../runtime/safari-playable-data.js";

assert.equal(SAFARI_CANONICAL_MOVE_FUNCTION_CODE_METADATA_V108.moveCount, 850);
assert.equal(SAFARI_CANONICAL_MOVE_FUNCTION_CODE_METADATA_V108.functionCodeCount, 464);
assert.equal(SAFARI_CANONICAL_MOVE_FUNCTION_CODE_METADATA_V108.canonicalFilteredCoreSha256, "e35eecadc21535e57a4cd9946abfea9a52ed9268b12456e2934e0ef7eeabb1ab");
assert.equal(safariCanonicalMoveFunctionCodeV108("TACKLE"), "None");
assert.equal(safariCanonicalMoveFunctionCodeV108("BITE"), "FlinchTarget");
assert.equal(safariCanonicalMoveFunctionCodeV108("THUNDERSHOCK"), "ParalyzeTarget");
assert.equal(safariCanonicalMoveFunctionCodeV108("SEISMICTOSS"), "FixedDamageUserLevel");
assert.equal(safariCanonicalMoveFunctionCodeV108("SUPERFANG"), "FixedDamageHalfTargetHP");
assert.equal(safariCanonicalMoveFunctionCodeV108("BURNINGBULWARK"), "ProtectUserBurningBulwark");
assert.throws(() => safariCanonicalMoveFunctionCodeV108("NOT_A_MOVE"), RangeError);

assert.equal(SAFARI_MOVE_MASTERS.BITE.function_code, "FlinchTarget");
assert.equal(SAFARI_MOVE_MASTERS.THUNDERSHOCK.function_code, "ParalyzeTarget");
assert.equal(SAFARI_MOVE_MASTERS.TACKLE.function_code, "None");

const result = installSafariGeneralMasters({}, {
  SEISMICTOSS: Object.freeze({ id: "SEISMICTOSS", category: "Physical", power: 1, accuracy: 100, total_pp: 20, priority: 0, type: "FIGHTING", thaws_user: false }),
  SUPERFANG: Object.freeze({ id: "SUPERFANG", category: "Physical", power: 1, accuracy: 90, total_pp: 10, priority: 0, type: "NORMAL", thaws_user: false }),
});
assert.equal(result.moveCount, 2);
assert.equal(SAFARI_MOVE_MASTERS.SEISMICTOSS.function_code, "FixedDamageUserLevel");
assert.equal(SAFARI_MOVE_MASTERS.SUPERFANG.function_code, "FixedDamageHalfTargetHP");

console.log("Safari canonical move FunctionCode facts smoke: PASS");
