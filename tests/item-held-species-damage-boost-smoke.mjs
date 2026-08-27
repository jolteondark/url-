import assert from "node:assert/strict";
import {
  HELD_SPECIES_DAMAGE_BOOST_ITEM_IDS,
  resolveHeldSpeciesDamageBoostCanonical,
} from "../runtime/item-held-species-damage-boost-effects.js";
import {
  HELD_TYPE_POWER_BOOST_ITEM_IDS,
  heldTypePowerMultiplier,
} from "../runtime/item-held-type-boost-effects.js";
import {
  BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL,
  resolveNormalPlayActionBeforeAbilityItemExtensionCanonical,
} from "../runtime/battle-core-ability-item-normal-play-extension.js";

assert.equal(HELD_SPECIES_DAMAGE_BOOST_ITEM_IDS.length, 10);
assert.deepEqual(HELD_SPECIES_DAMAGE_BOOST_ITEM_IDS, [
  "ADAMANTCRYSTAL", "ADAMANTORB", "CORNERSTONEMASK", "GRISEOUSCORE", "GRISEOUSORB",
  "HEARTHFLAMEMASK", "LUSTROUSGLOBE", "LUSTROUSORB", "SOULDEW", "WELLSPRINGMASK",
]);

for (const item of ["ADAMANTORB", "ADAMANTCRYSTAL"]) {
  assert.equal(resolveHeldSpeciesDamageBoostCanonical({ itemId: item, species: "DIALGA", moveType: "DRAGON" }).powerMultiplier, 1.2);
  assert.equal(resolveHeldSpeciesDamageBoostCanonical({ itemId: item, species: "DIALGA", moveType: "STEEL" }).powerMultiplier, 1.2);
  assert.equal(resolveHeldSpeciesDamageBoostCanonical({ itemId: item, species: "DIALGA", moveType: "FIRE" }).powerMultiplier, 1);
  assert.equal(resolveHeldSpeciesDamageBoostCanonical({ itemId: item, species: "PALKIA", moveType: "DRAGON" }).powerMultiplier, 1);
}
for (const item of ["LUSTROUSORB", "LUSTROUSGLOBE"]) {
  assert.equal(resolveHeldSpeciesDamageBoostCanonical({ itemId: item, species: "PALKIA", moveType: "DRAGON" }).powerMultiplier, 1.2);
  assert.equal(resolveHeldSpeciesDamageBoostCanonical({ itemId: item, species: "PALKIA", moveType: "WATER" }).powerMultiplier, 1.2);
}
for (const item of ["GRISEOUSORB", "GRISEOUSCORE"]) {
  assert.equal(resolveHeldSpeciesDamageBoostCanonical({ itemId: item, species: "GIRATINA", moveType: "DRAGON" }).powerMultiplier, 1.2);
  assert.equal(resolveHeldSpeciesDamageBoostCanonical({ itemId: item, species: "GIRATINA", moveType: "GHOST" }).powerMultiplier, 1.2);
}

for (const species of ["LATIAS", "LATIOS"]) {
  const soulDew = resolveHeldSpeciesDamageBoostCanonical({ itemId: "SOULDEW", species, moveType: "PSYCHIC" });
  assert.equal(soulDew.powerMultiplier, 1);
  assert.equal(soulDew.finalDamageMultiplier, 1.2);
}
assert.equal(resolveHeldSpeciesDamageBoostCanonical({ itemId: "SOULDEW", species: "LATIAS", moveType: "WATER" }).finalDamageMultiplier, 1);
assert.equal(resolveHeldSpeciesDamageBoostCanonical({ itemId: "SOULDEW", species: "MEW", moveType: "PSYCHIC" }).finalDamageMultiplier, 1);

for (const item of ["WELLSPRINGMASK", "HEARTHFLAMEMASK", "CORNERSTONEMASK"]) {
  assert.equal(resolveHeldSpeciesDamageBoostCanonical({ itemId: item, species: "OGERPON", moveType: "NORMAL" }).finalDamageMultiplier, 1.2);
  assert.equal(resolveHeldSpeciesDamageBoostCanonical({ itemId: item, species: "PIKACHU", moveType: "NORMAL" }).finalDamageMultiplier, 1);
}

assert.equal(HELD_TYPE_POWER_BOOST_ITEM_IDS.length, 41);
assert.equal(heldTypePowerMultiplier({ itemId: "BLANKPLATE", moveType: "NORMAL" }), 1.2);
assert.equal(heldTypePowerMultiplier({ itemId: "BLANKPLATE", moveType: "FIRE" }), 1);

const dialga = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
  user: { species: "DIALGA", held_item: "ADAMANTCRYSTAL" },
  target: {},
  move: { type: "STEEL", category: "Special" },
});
assert.equal(dialga.damageMultiplierInput.externalPowerMultiplier, 1.2);
assert.equal(dialga.damageMultiplierInput.externalFinalDamageMultiplier, 1);
assert.equal(dialga.speciesDamageBoost.triggered, true);

const latias = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
  user: { species: "LATIAS", held_item: "SOULDEW" },
  target: {},
  move: { type: "DRAGON", category: "Special" },
});
assert.equal(latias.damageMultiplierInput.externalPowerMultiplier, 1);
assert.equal(latias.damageMultiplierInput.externalFinalDamageMultiplier, 1.2);

const ogerpon = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
  user: { species: "OGERPON", held_item: "WELLSPRINGMASK" },
  target: {},
  move: { type: "WATER", category: "Physical" },
});
assert.equal(ogerpon.damageMultiplierInput.externalFinalDamageMultiplier, 1.2);

const blankPlate = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
  user: { species: "EEVEE", held_item: "BLANKPLATE" },
  target: {},
  move: { type: "NORMAL", category: "Physical" },
});
assert.equal(blankPlate.damageMultiplierInput.externalPowerMultiplier, 1.2);

assert.equal(BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL.classificationCounts.typeBoostHeldItems, 41);
assert.equal(BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL.classificationCounts.speciesSpecificDamageBoostHeldItems, 10);
for (const item of HELD_SPECIES_DAMAGE_BOOST_ITEM_IDS) {
  assert.ok(BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL.itemIds.includes(item));
}
assert.ok(BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL.itemIds.includes("BLANKPLATE"));

console.log("item-held-species-damage-boost-smoke: ok");
