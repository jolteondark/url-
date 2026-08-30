import assert from "node:assert/strict";
import { getCanonicalBlockedItemEffectMapping } from "../runtime/item-canonical-blocked-effect-mappings.js";

const direHit = getCanonicalBlockedItemEffectMapping("DIREHIT");
assert.equal(direHit.known, true);
assert.equal(direHit.family, "focus_energy");
assert.equal(direHit.eligibility.focusEnergyBelow, 1);
assert.equal(direHit.apply.setFocusEnergy, 2);
assert.equal(direHit.consumeOnFailure, false);

const direHit2 = getCanonicalBlockedItemEffectMapping("DIREHIT2");
assert.equal(direHit2.eligibility.focusEnergyBelow, 2);
assert.equal(direHit2.apply.setFocusEnergy, 2);

const direHit3 = getCanonicalBlockedItemEffectMapping("DIREHIT3");
assert.equal(direHit3.eligibility.focusEnergyBelow, 3);
assert.equal(direHit3.apply.setFocusEnergy, 3);

const guardSpec = getCanonicalBlockedItemEffectMapping("GUARDSPEC");
assert.equal(guardSpec.family, "side_mist");
assert.equal(guardSpec.eligibility.mistTurnsEqual, 0);
assert.equal(guardSpec.apply.setMistTurns, 5);
assert.equal(guardSpec.consumeOnFailure, false);

for (const [itemId, steps] of [["REPEL", 100], ["SUPERREPEL", 200], ["MAXREPEL", 250]]) {
  const effect = getCanonicalBlockedItemEffectMapping(itemId);
  assert.equal(effect.family, "repel_steps");
  assert.equal(effect.target, "field");
  assert.equal(effect.eligibility.activeRepelStepsEqual, 0);
  assert.equal(effect.apply.setRepelSteps, steps);
  assert.equal(effect.consumeOnFailure, false);
}

assert.equal(getCanonicalBlockedItemEffectMapping("POTION").known, false);
console.log("canonical blocked item effect mapping smoke: ok");
