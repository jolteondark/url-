import assert from "node:assert/strict";
import { getCanonicalBlockedItemEffectMapping } from "../runtime/item-canonical-blocked-effect-mappings.js";
import { getItemEffectSupportStatus } from "../runtime/item-effect-support-status.js";

const evolutionItems = [
  "FIRESTONE", "THUNDERSTONE", "WATERSTONE", "LEAFSTONE", "MOONSTONE",
  "SUNSTONE", "DUSKSTONE", "DAWNSTONE", "SHINYSTONE", "ICESTONE",
  "SWEETAPPLE", "TARTAPPLE", "CRACKEDPOT", "CHIPPEDPOT",
  "GALARICACUFF", "GALARICAWREATH", "BLACKAUGURITE", "PEATBLOCK",
  "LINKINGCORD", "AUSPICIOUSARMOR", "MALICIOUSARMOR",
  "SCROLLOFDARKNESS", "SCROLLOFWATERS", "SYRUPYAPPLE",
  "UNREMARKABLETEACUP", "MASTERPIECETEACUP", "METALALLOY",
];

assert.equal(evolutionItems.length, 27);
for (const itemId of evolutionItems) {
  const effect = getCanonicalBlockedItemEffectMapping(itemId);
  assert.equal(effect.known, true, itemId);
  assert.equal(effect.family, "item_evolution", itemId);
  assert.equal(effect.target, "selected_party_pokemon", itemId);
  assert.equal(effect.eligibility.requireMatchingCanonicalItemEvolution, true, itemId);
  assert.equal(effect.apply.useCanonicalEvolutionSequence, true, itemId);
  assert.equal(effect.consumeOnFailure, false, itemId);

  const status = getItemEffectSupportStatus(itemId);
  assert.equal(status.status, "effect_mapped_owner_blocked", itemId);
  assert.equal(status.family, "item_evolution", itemId);
  assert.match(status.ownerNeeded, /species\/form item-evolution resolver/, itemId);
  assert.match(status.ownerNeeded, /consume-on-success/, itemId);
}

const rareCandy = getCanonicalBlockedItemEffectMapping("RARECANDY");
assert.equal(rareCandy.known, true);
assert.equal(rareCandy.family, "level_up_item");
assert.equal(rareCandy.target, "selected_party_pokemon");
assert.equal(rareCandy.eligibility.requireLevelBelowMaximum, true);
assert.equal(rareCandy.apply.levelDelta, 1);
assert.equal(rareCandy.apply.useCanonicalLevelUpSequence, true);
assert.equal(rareCandy.consumeOnFailure, false);

const rareCandyStatus = getItemEffectSupportStatus("RARECANDY");
assert.equal(rareCandyStatus.status, "effect_mapped_owner_blocked");
assert.equal(rareCandyStatus.family, "level_up_item");
assert.match(rareCandyStatus.ownerNeeded, /level\/experience owner/);
assert.match(rareCandyStatus.ownerNeeded, /move-learning\/evolution sequence/);
assert.match(rareCandyStatus.ownerNeeded, /consume-on-success/);

console.log("evolution item support status smoke: ok");
