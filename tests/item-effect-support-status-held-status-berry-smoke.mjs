import assert from "node:assert/strict";
import { getItemEffectSupportStatus } from "../runtime/item-effect-support-status.js";

for (const itemId of ["CHERIBERRY", "CHESTOBERRY", "PECHABERRY", "RAWSTBERRY", "ASPEARBERRY"]) {
  const status = getItemEffectSupportStatus(itemId);
  assert.equal(status.known, true, `${itemId} should be reviewed`);
  assert.equal(status.status, "connected", `${itemId} major-status held trigger should be connected`);
  assert.equal(status.family, "medicine_status_healing");
  assert.match(status.owner, /battle-ability-item-hook-dispatch/);
  assert.match(status.owner, /battle-status-pp-flow/);
  assert.match(status.owner, /battle-held-item-consumption-flow/);
}

for (const itemId of ["LUMBERRY", "PERSIMBERRY"]) {
  const status = getItemEffectSupportStatus(itemId);
  assert.equal(status.known, true, `${itemId} should be reviewed`);
  assert.equal(status.status, "partially_connected", `${itemId} confusion cure must not be silently marked connected`);
  assert.match(status.remaining, /confusion/);
}

assert.match(getItemEffectSupportStatus("LUMBERRY").remaining, /major-status/);

console.log("held status berry support status smoke: ok");
