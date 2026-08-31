import assert from "node:assert/strict";
import { getCanonicalBlockedItemEffectMapping } from "../runtime/item-canonical-blocked-effect-mappings.js";
import { getItemEffectSupportStatus } from "../runtime/item-effect-support-status.js";

const expCandyAmounts = Object.freeze({
  EXPCANDYXS: 100,
  EXPCANDYS: 800,
  EXPCANDYM: 3_000,
  EXPCANDYL: 10_000,
  EXPCANDYXL: 30_000,
});

for (const [itemId, experienceGain] of Object.entries(expCandyAmounts)) {
  const effect = getCanonicalBlockedItemEffectMapping(itemId);
  assert.equal(effect.known, true, itemId);
  assert.equal(effect.family, "experience_candy", itemId);
  assert.equal(effect.target, "selected_party_pokemon", itemId);
  assert.equal(effect.eligibility.requireLevelBelowMaximum, true, itemId);
  assert.equal(effect.eligibility.shadowPokemonDisallowed, true, itemId);
  assert.equal(effect.apply.experienceGain, experienceGain, itemId);
  assert.equal(effect.apply.useCanonicalExperienceGainSequence, true, itemId);
  assert.equal(effect.consumeOnFailure, false, itemId);

  const status = getItemEffectSupportStatus(itemId);
  assert.equal(status.status, "effect_mapped_owner_blocked", itemId);
  assert.equal(status.family, "experience_candy", itemId);
  assert.match(status.ownerNeeded, /experience\/growth-rate owner/, itemId);
  assert.match(status.ownerNeeded, /consume-on-success/, itemId);
}

const prisonBottle = getCanonicalBlockedItemEffectMapping("PRISONBOTTLE");
assert.equal(prisonBottle.known, true);
assert.equal(prisonBottle.family, "pokemon_form_change");
assert.equal(prisonBottle.target, "selected_party_pokemon");
assert.equal(prisonBottle.eligibility.speciesRequired, "HOOPA");
assert.equal(prisonBottle.eligibility.requireNotFainted, true);
assert.deepEqual(prisonBottle.apply.toggleForms, [0, 1]);
assert.equal(prisonBottle.apply.useCanonicalSetForm, true);
assert.equal(prisonBottle.consumable, false);
assert.equal(prisonBottle.consumeOnFailure, false);

const prisonStatus = getItemEffectSupportStatus("PRISONBOTTLE");
assert.equal(prisonStatus.status, "effect_mapped_owner_blocked");
assert.equal(prisonStatus.family, "pokemon_form_change");
assert.match(prisonStatus.ownerNeeded, /setForm owner/);
assert.match(prisonStatus.ownerNeeded, /non-consumable/);

console.log("Exp Candy and Prison Bottle canonical mapping smoke: ok");
