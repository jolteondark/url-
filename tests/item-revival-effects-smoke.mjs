import assert from "node:assert/strict";
import { applyBitterMedicineHappiness } from "../runtime/item-hp-healing-effects.js";
import {
  isRevivalItem,
  resolveRevivalItemEffect,
} from "../runtime/item-revival-effects.js";

assert.equal(isRevivalItem("revive"), true);
assert.equal(isRevivalItem("maxrevive"), true);
assert.equal(isRevivalItem("revivalherb"), true);
assert.equal(isRevivalItem("potion"), false);

assert.deepEqual(resolveRevivalItemEffect({ itemId: "REVIVE", hp: 0, maxHp: 101 }), {
  itemId: "REVIVE",
  supported: true,
  used: true,
  result: "used",
  effect: "revive_half",
  hpBefore: 0,
  hpAfter: 50,
  hpGain: 50,
  curesStatus: true,
  happinessMethod: null,
});
assert.equal(resolveRevivalItemEffect({ itemId: "REVIVE", hp: 0, maxHp: 1 }).hpAfter, 1);
assert.equal(resolveRevivalItemEffect({ itemId: "MAXREVIVE", hp: 0, maxHp: 101 }).hpAfter, 101);
const herb = resolveRevivalItemEffect({ itemId: "REVIVALHERB", hp: 0, maxHp: 101 });
assert.equal(herb.hpAfter, 101);
assert.equal(herb.curesStatus, true);
assert.equal(herb.happinessMethod, "revivalherb");
assert.equal(applyBitterMedicineHappiness(50, "revivalherb"), 35);
assert.equal(applyBitterMedicineHappiness(150, "revivalherb"), 135);
assert.equal(applyBitterMedicineHappiness(250, "revivalherb"), 230);

const alive = resolveRevivalItemEffect({ itemId: "REVIVE", hp: 1, maxHp: 100 });
assert.equal(alive.used, false);
assert.equal(alive.result, "no_effect");
assert.equal(alive.hpAfter, 1);

const unsupported = resolveRevivalItemEffect({ itemId: "POTION", hp: 0, maxHp: 100 });
assert.equal(unsupported.supported, false);
assert.equal(unsupported.used, false);
assert.equal(unsupported.result, "unsupported_item");

console.log("item revival effects smoke: ok");
