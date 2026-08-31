import assert from "node:assert/strict";
import { isRevivalItem, resolveRevivalItemEffect } from "../runtime/item-revival-effects.js";
import { getItemEffectSupportStatus } from "../runtime/item-effect-support-status.js";

assert.equal(isRevivalItem("MAXHONEY"), true);

const revived = resolveRevivalItemEffect({ itemId: "MAXHONEY", hp: 0, maxHp: 137 });
assert.equal(revived.supported, true);
assert.equal(revived.used, true);
assert.equal(revived.effect, "revive_full");
assert.equal(revived.hpBefore, 0);
assert.equal(revived.hpAfter, 137);
assert.equal(revived.curesStatus, true);
assert.equal(revived.happinessMethod, null);

const noEffect = resolveRevivalItemEffect({ itemId: "MAXHONEY", hp: 1, maxHp: 137 });
assert.equal(noEffect.supported, true);
assert.equal(noEffect.used, false);
assert.equal(noEffect.result, "no_effect");
assert.equal(noEffect.hpAfter, 1);

const status = getItemEffectSupportStatus("MAXHONEY");
assert.equal(status.known, true);
assert.equal(status.status, "connected");
assert.equal(status.family, "medicine_revival");
assert.equal(status.owner, "safari-bag-item-use");

console.log("Max Honey revival smoke: ok");
