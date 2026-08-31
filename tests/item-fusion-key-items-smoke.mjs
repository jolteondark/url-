import assert from "node:assert/strict";
import { getCanonicalBlockedItemEffectMapping } from "../runtime/item-canonical-blocked-effect-mappings.js";
import { getItemEffectSupportStatus } from "../runtime/item-effect-support-status.js";

const fusionCases = [
  ["DNASPLICERS", "KYUREM", { RESHIRAM: 1, ZEKROM: 2 }, "DNASPLICERSUSED"],
  ["NSOLARIZER", "NECROZMA", { SOLGALEO: 1 }, "NSOLARIZERUSED"],
  ["NLUNARIZER", "NECROZMA", { LUNALA: 2 }, "NLUNARIZERUSED"],
  ["REINSOFUNITY", "CALYREX", { GLASTRIER: 1, SPECTRIER: 2 }, "REINSOFUNITYUSED"],
];

for (const [itemId, primarySpecies, companionForms, usedItemId] of fusionCases) {
  const effect = getCanonicalBlockedItemEffectMapping(itemId);
  assert.equal(effect.known, true);
  assert.equal(effect.family, "pokemon_fusion_key_item");
  assert.equal(effect.target, "selected_party_pokemon_then_companion");
  assert.equal(effect.eligibility.primarySpeciesRequired, primarySpecies);
  assert.equal(effect.eligibility.primaryRequireNotFainted, true);
  assert.equal(effect.eligibility.primaryRequireNotFused, true);
  assert.equal(effect.eligibility.companionRequireDifferentPartyPokemon, true);
  assert.equal(effect.eligibility.companionEggDisallowed, true);
  assert.equal(effect.eligibility.companionRequireNotFainted, true);
  assert.deepEqual(effect.eligibility.companionSpeciesToForm, companionForms);
  assert.equal(effect.apply.useCanonicalSetForm, true);
  assert.equal(effect.apply.storeCompanionInFusedState, true);
  assert.equal(effect.apply.removeCompanionFromParty, true);
  assert.equal(effect.apply.replaceBagItemWith, usedItemId);
  assert.equal(effect.selectionCancelReturnsFailure, true);
  assert.equal(effect.consumable, false);
  assert.equal(effect.consumeOnFailure, false);
}

const separationCases = [
  ["DNASPLICERSUSED", "KYUREM", null, "DNASPLICERS"],
  ["NSOLARIZERUSED", "NECROZMA", 1, "NSOLARIZER"],
  ["NLUNARIZERUSED", "NECROZMA", 2, "NLUNARIZER"],
  ["REINSOFUNITYUSED", "CALYREX", null, "REINSOFUNITY"],
];

for (const [itemId, primarySpecies, requiredForm, unusedItemId] of separationCases) {
  const effect = getCanonicalBlockedItemEffectMapping(itemId);
  assert.equal(effect.known, true);
  assert.equal(effect.family, "pokemon_fusion_key_item");
  assert.equal(effect.target, "selected_party_pokemon");
  assert.equal(effect.eligibility.primarySpeciesRequired, primarySpecies);
  assert.equal(effect.eligibility.primaryRequireNotFainted, true);
  assert.equal(effect.eligibility.primaryRequireFused, true);
  if (requiredForm === null) assert.equal(effect.eligibility.primaryFormRequired, undefined);
  else assert.equal(effect.eligibility.primaryFormRequired, requiredForm);
  assert.equal(effect.apply.setPrimaryForm, 0);
  assert.equal(effect.apply.useCanonicalSetForm, true);
  assert.equal(effect.apply.restoreFusedCompanionToParty, true);
  assert.equal(effect.apply.clearFusedState, true);
  assert.equal(effect.apply.replaceBagItemWith, unusedItemId);
  assert.equal(effect.consumable, false);
  assert.equal(effect.consumeOnFailure, false);
}

for (const itemId of [...fusionCases.map(([id]) => id), ...separationCases.map(([id]) => id)]) {
  const status = getItemEffectSupportStatus(itemId);
  assert.equal(status.status, "effect_mapped_owner_blocked");
  assert.equal(status.family, "pokemon_fusion_key_item");
  assert.match(status.ownerNeeded, /fused-state/);
  assert.match(status.ownerNeeded, /Party remove\/restore/);
  assert.match(status.ownerNeeded, /Bag key-item replace/);
}

console.log("fusion key item mapping smoke: ok");
