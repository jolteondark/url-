import assert from "node:assert/strict";
import { getItemEffectSupportStatus } from "../runtime/item-effect-support-status.js";
import { getCanonicalBlockedItemEffectMapping } from "../runtime/item-canonical-blocked-effect-mappings.js";

const status = getItemEffectSupportStatus("ZYGARDECUBE");
assert.equal(status.known, true);
assert.equal(status.status, "effect_mapped_owner_blocked");
assert.equal(status.family, "zygarde_cube");
assert.match(status.ownerNeeded, /setForm/);
assert.match(status.ownerNeeded, /ability-index/);
assert.match(status.ownerNeeded, /non-consumable/);

const effect = getCanonicalBlockedItemEffectMapping("ZYGARDECUBE");
assert.equal(effect.known, true);
assert.equal(effect.family, "zygarde_cube");
assert.equal(effect.target, "selected_party_pokemon_then_action_choice");
assert.equal(effect.eligibility.speciesRequired, "ZYGARDE");
assert.equal(effect.eligibility.requireNotFainted, true);
assert.deepEqual(effect.choices.changeForm.apply.toggleForms, [0, 1]);
assert.equal(effect.choices.changeForm.apply.useCanonicalSetForm, true);
assert.deepEqual(effect.choices.changeAbility.apply.toggleAbilityIndex, [0, 1]);
assert.equal(effect.choices.changeAbility.apply.clearCachedAbility, true);
assert.equal(effect.selectionCancelReturnsFailure, true);
assert.equal(effect.consumable, false);
assert.equal(effect.consumeOnFailure, false);

console.log("Zygarde Cube support status smoke: PASS");
