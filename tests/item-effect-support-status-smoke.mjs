import assert from "node:assert/strict";
import { getItemEffectSupportStatus } from "../runtime/item-effect-support-status.js";

assert.deepEqual(getItemEffectSupportStatus("xattack"), {
  itemId: "XATTACK", known: true, status: "connected", family: "battle_stat_stage", owner: "safari-normal-battle-lifecycle",
});
assert.equal(getItemEffectSupportStatus("DIREHIT").status, "effect_mapped_owner_blocked");
assert.match(getItemEffectSupportStatus("DIREHIT").ownerNeeded, /Focus Energy/);
assert.equal(getItemEffectSupportStatus("GUARDSPEC").status, "effect_mapped_owner_blocked");
assert.match(getItemEffectSupportStatus("REPEL").ownerNeeded, /movement\/encounter\/persistence/);
assert.equal(getItemEffectSupportStatus("POKETOY").status, "connected");
assert.deepEqual(getItemEffectSupportStatus("NOT_REVIEWED_YET"), {
  itemId: "NOT_REVIEWED_YET", known: false, status: "unreviewed",
});

console.log("item effect support status smoke: ok");
