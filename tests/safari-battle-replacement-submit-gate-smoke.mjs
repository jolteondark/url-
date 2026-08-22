import assert from "node:assert/strict";
import { claimSafariBattleReplacementSubmit } from "../runtime/safari-battle-replacement-submit-gate.js";

const token = Object.freeze({ sequence: 1 });
assert.equal(claimSafariBattleReplacementSubmit(token), token);
assert.throws(
  () => claimSafariBattleReplacementSubmit(token),
  /already been claimed/,
  "the same replacement capability must not submit twice",
);

const nextToken = Object.freeze({ sequence: 2 });
assert.equal(claimSafariBattleReplacementSubmit(nextToken), nextToken);
assert.throws(
  () => claimSafariBattleReplacementSubmit(null),
  /requires a central replacement commit token/,
);

console.log("Safari Battle replacement submit gate smoke: PASS");
