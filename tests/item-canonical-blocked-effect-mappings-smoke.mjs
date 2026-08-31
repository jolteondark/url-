import assert from "node:assert/strict";
import { getCanonicalBlockedItemEffectMapping } from "../runtime/item-canonical-blocked-effect-mappings.js";
import { getItemEffectSupportStatus } from "../runtime/item-effect-support-status.js";

const capsule = getCanonicalBlockedItemEffectMapping("ABILITYCAPSULE");
assert.equal(capsule.known, true);
assert.equal(capsule.family, "ability_mutation");
assert.equal(capsule.target, "selected_party_pokemon");
assert.deepEqual(capsule.eligibility.requireNormalAbilitySlots, [0, 1]);
assert.equal(capsule.eligibility.hiddenAbilityDisallowed, true);
assert.deepEqual(capsule.eligibility.speciesDisallowed, ["ZYGARDE"]);
assert.deepEqual(capsule.apply.toggleAbilityIndex, [0, 1]);
assert.equal(capsule.consumeOnFailure, false);

const patch = getCanonicalBlockedItemEffectMapping("ABILITYPATCH");
assert.equal(patch.known, true);
assert.equal(patch.family, "ability_mutation");
assert.equal(patch.target, "selected_party_pokemon");
assert.equal(patch.eligibility.requireDestinationAbility, true);
assert.deepEqual(patch.eligibility.speciesDisallowed, ["ZYGARDE"]);
assert.equal(patch.apply.normalAbilityToHiddenIndex, 2);
assert.equal(patch.apply.hiddenAbilityToNormalIndex, 0);
assert.equal(patch.consumeOnFailure, false);

for (const itemId of ["ABILITYCAPSULE", "ABILITYPATCH"]) {
  const status = getItemEffectSupportStatus(itemId);
  assert.equal(status.status, "effect_mapped_owner_blocked");
  assert.equal(status.family, "ability_mutation");
  assert.match(status.ownerNeeded, /ability-index/);
  assert.match(status.ownerNeeded, /consume-on-success/);
}

const gracidea = getCanonicalBlockedItemEffectMapping("GRACIDEA");
assert.equal(gracidea.known, true);
assert.equal(gracidea.family, "pokemon_form_change");
assert.equal(gracidea.target, "selected_party_pokemon");
assert.equal(gracidea.eligibility.speciesRequired, "SHAYMIN");
assert.equal(gracidea.eligibility.requireNotFainted, true);
assert.deepEqual(gracidea.eligibility.statusesDisallowed, ["FROZEN", "FROSTBITE"]);
assert.equal(gracidea.eligibility.requireNotNight, true);
assert.deepEqual(gracidea.apply.toggleForms, [0, 1]);
assert.equal(gracidea.apply.useCanonicalSetForm, true);
assert.equal(gracidea.consumable, false);

const revealGlass = getCanonicalBlockedItemEffectMapping("REVEALGLASS");
assert.equal(revealGlass.family, "pokemon_form_change");
assert.equal(revealGlass.eligibility.requireSpeciesFlag, "ForcesOfNature");
assert.equal(revealGlass.eligibility.requireNotFainted, true);
assert.deepEqual(revealGlass.apply.toggleForms, [0, 1]);
assert.equal(revealGlass.consumable, false);

const meteorite = getCanonicalBlockedItemEffectMapping("METEORITE");
assert.equal(meteorite.family, "pokemon_form_change");
assert.equal(meteorite.eligibility.speciesRequired, "DEOXYS");
assert.equal(meteorite.eligibility.requireNotFainted, true);
assert.equal(meteorite.eligibility.requireDestinationFormDifferent, true);
assert.deepEqual(meteorite.apply.chooseFormFrom, [0, 1, 2, 3]);
assert.equal(meteorite.consumable, false);
assert.equal(meteorite.consumeOnFailure, false);

for (const itemId of ["GRACIDEA", "REVEALGLASS", "METEORITE"]) {
  const status = getItemEffectSupportStatus(itemId);
  assert.equal(status.status, "effect_mapped_owner_blocked");
  assert.equal(status.family, "pokemon_form_change");
  assert.match(status.ownerNeeded, /setForm owner/);
  assert.match(status.ownerNeeded, /non-consumable/);
}

const lum = getCanonicalBlockedItemEffectMapping("LUMBERRY");
assert.equal(lum.known, true);
assert.equal(lum.family, "medicine_status_healing");
assert.equal(lum.target, "holder_battler");
assert.equal(lum.eligibility.requireCanConsumeBerryUnlessForced, true);
assert.equal(lum.eligibility.requirePrimaryStatusOrConfusion, true);
assert.equal(lum.apply.curePrimaryStatus, true);
assert.equal(lum.apply.cureConfusion, true);
assert.equal(lum.consumeOnFailure, false);

const persim = getCanonicalBlockedItemEffectMapping("PERSIMBERRY");
assert.equal(persim.known, true);
assert.equal(persim.family, "medicine_status_healing");
assert.equal(persim.target, "holder_battler");
assert.equal(persim.eligibility.requireCanConsumeBerryUnlessForced, true);
assert.equal(persim.eligibility.requireConfusion, true);
assert.equal(persim.apply.cureConfusion, true);
assert.equal(persim.apply.curePrimaryStatus, undefined);
assert.equal(persim.consumeOnFailure, false);

for (const itemId of ["LUMBERRY", "PERSIMBERRY"]) {
  const status = getItemEffectSupportStatus(itemId);
  assert.equal(status.status, "effect_mapped_owner_blocked");
  assert.equal(status.family, "medicine_status_healing");
  assert.match(status.ownerNeeded, /confusion-state owner/);
  assert.match(status.ownerNeeded, /Bag target-use remains connected/);
}

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
