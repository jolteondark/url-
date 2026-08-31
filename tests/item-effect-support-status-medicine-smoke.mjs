import assert from "node:assert/strict";
import { getItemEffectSupportStatus } from "../runtime/item-effect-support-status.js";

const expected = new Map([
  ["POTION", "medicine_hp_healing"],
  ["MAXPOTION", "medicine_hp_healing"],
  ["ENERGYROOT", "medicine_hp_healing"],
  ["FULLHEAL", "medicine_status_healing"],
  ["RAGECANDYBAR", "medicine_status_healing"],
  ["FULLRESTORE", "medicine_full_restore"],
  ["ETHER", "medicine_pp_restore"],
  ["MAXETHER", "medicine_pp_restore"],
  ["ELIXIR", "medicine_pp_restore"],
  ["MAXELIXIR", "medicine_pp_restore"],
  ["PPUP", "medicine_pp_capacity"],
  ["PPMAX", "medicine_pp_capacity"],
  ["REVIVE", "medicine_revival"],
  ["MAXREVIVE", "medicine_revival"],
  ["REVIVALHERB", "medicine_revival"],
]);

for (const [itemId, family] of expected) {
  const status = getItemEffectSupportStatus(itemId);
  assert.equal(status.known, true, `${itemId} should be reviewed`);
  assert.equal(status.status, "connected", `${itemId} should be connected`);
  assert.equal(status.family, family, `${itemId} should retain its canonical family`);
  assert.equal(status.owner, "safari-bag-item-use", `${itemId} should use the shared Bag owner`);
}

for (const itemId of ["BERRYJUICE", "ORANBERRY", "SITRUSBERRY"]) {
  const status = getItemEffectSupportStatus(itemId);
  assert.equal(status.status, "connected", `${itemId} Bag and automatic held HP recovery should both be connected`);
  assert.equal(status.family, "medicine_hp_healing");
  assert.match(status.owner, /battle-ability-item-hook-dispatch/);
  assert.match(status.owner, /battle-runtime-integration/);
  assert.match(status.owner, /battle-held-item-runtime-integration/);
}

for (const itemId of ["LEPPABERRY", "HOPOBERRY"]) {
  const status = getItemEffectSupportStatus(itemId);
  assert.equal(status.status, "connected", `${itemId} Bag use and canonical held 0-PP exact-move trigger should both be connected`);
  assert.equal(status.family, "medicine_pp_restore");
  assert.match(status.owner, /safari-bag-item-use/);
  assert.match(status.owner, /safari-normal-battle-round-pre-gems/);
  assert.match(status.owner, /item-held-pp-restore-berry-effects/);
}

for (const itemId of ["LUMBERRY", "PERSIMBERRY"]) {
  const status = getItemEffectSupportStatus(itemId);
  assert.equal(status.status, "effect_mapped_owner_blocked", `${itemId} held confusion cure should not be reported as partially wired without a shared confusion owner`);
  assert.equal(status.family, "medicine_status_healing");
  assert.match(status.ownerNeeded, /confusion-state owner/);
  assert.match(status.ownerNeeded, /Bag target-use remains connected/);
}

assert.notEqual(getItemEffectSupportStatus("FULLRESTORE").family, "medicine_hp_healing");
assert.notEqual(getItemEffectSupportStatus("ETHER").family, "medicine_hp_healing");
assert.notEqual(getItemEffectSupportStatus("REVIVE").family, "medicine_hp_healing");

console.log("medicine item effect support status smoke: ok");
