import assert from "node:assert/strict";
import { getCanonicalBlockedItemEffectMapping } from "../runtime/item-canonical-blocked-effect-mappings.js";
import { getItemEffectSupportStatus } from "../runtime/item-effect-support-status.js";

const effect = getCanonicalBlockedItemEffectMapping("ROTOMCATALOG");
assert.equal(effect.known, true);
assert.equal(effect.family, "pokemon_form_change");
assert.equal(effect.target, "selected_party_pokemon");
assert.equal(effect.eligibility.speciesRequired, "ROTOM");
assert.equal(effect.eligibility.requireNotFainted, true);
assert.equal(effect.eligibility.requireDestinationFormDifferent, true);
assert.deepEqual(effect.apply.chooseFormFrom, [0, 1, 2, 3, 4, 5]);
assert.equal(effect.apply.useCanonicalSetForm, true);
assert.equal(effect.selectionCancelReturnsFailure, true);
assert.equal(effect.consumable, false);
assert.equal(effect.consumeOnFailure, false);

const status = getItemEffectSupportStatus("ROTOMCATALOG");
assert.equal(status.status, "effect_mapped_owner_blocked");
assert.equal(status.family, "pokemon_form_change");
assert.match(status.ownerNeeded, /setForm owner/);
assert.match(status.ownerNeeded, /non-consumable/);

console.log("Rotom Catalog canonical mapping smoke: ok");
