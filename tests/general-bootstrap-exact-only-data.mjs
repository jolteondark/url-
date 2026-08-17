import assert from "node:assert/strict";
import {
  SAFARI_MOVE_MASTERS,
  installSafariGeneralMasters,
  safariGeneralMastersInstalled,
} from "../runtime/safari-playable-data.js";

assert.equal(safariGeneralMastersInstalled(), false);
assert.deepEqual(Object.keys(SAFARI_MOVE_MASTERS).sort(), ["BITE", "QUICKATTACK", "SWIFT", "TACKLE", "THUNDERSHOCK"]);
assert.equal(SAFARI_MOVE_MASTERS.TACKLE.power, 40);
assert.equal(SAFARI_MOVE_MASTERS.FIREBLAST, undefined);

const installed = installSafariGeneralMasters({}, {
  FIREBLAST: Object.freeze({ id: "FIREBLAST", power: 110 }),
});
assert.equal(installed.moveCount, 1);
assert.equal(safariGeneralMastersInstalled(), true);
assert.equal(SAFARI_MOVE_MASTERS.FIREBLAST.power, 110);
assert.equal(SAFARI_MOVE_MASTERS.TACKLE.power, 40);

console.log("PASS GENERAL bootstrap exact-only data contract");
