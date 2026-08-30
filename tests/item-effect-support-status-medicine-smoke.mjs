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

for (const itemId of ["BERRYJUICE", "ORANBERRY", "SITRUSBERRY", "LEPPABERRY", "HOPOBERRY"]) {
  const status = getItemEffectSupportStatus(itemId);
  assert.equal(status.status, "partially_connected", `${itemId} Bag use is connected but held behavior remains separate`);
  assert.equal(status.owner, "safari-bag-item-use");
  assert.match(status.remaining, /held-item/);
}

for (const itemId of ["LUMBERRY", "PERSIMBERRY"]) {
  const status = getItemEffectSupportStatus(itemId);
  assert.equal(status.status, "partially_connected", `${itemId} confusion cure remains a separate held boundary`);
  assert.match(status.remaining, /confusion/);
}

assert.notEqual(getItemEffectSupportStatus("FULLRESTORE").family, "medicine_hp_healing");
assert.notEqual(getItemEffectSupportStatus("ETHER").family, "medicine_hp_healing");
assert.notEqual(getItemEffectSupportStatus("REVIVE").family, "medicine_hp_healing");

console.log("medicine item effect support status smoke: ok");