import assert from "node:assert/strict";
import {
  BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL,
  resolveNormalPlayActionBeforeAbilityItemExtensionCanonical,
} from "../runtime/battle-core-ability-item-normal-play-extension.js";

const pokemon = (species, heldItem, extra = {}) => ({
  species,
  ability: "NONE",
  held_item: heldItem,
  status: "NONE",
  hp: 100,
  max_hp: 100,
  ...extra,
});

const action = (user, target, category = "Physical") => resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
  user,
  target,
  move: { id: "TESTMOVE", type: "NORMAL", category, power: 80 },
});

assert.equal(action(pokemon("PIKACHU", "LIGHTBALL"), pokemon("EEVEE"), "Physical").damageMultiplierInput.externalAttackMultiplier, 2);
assert.equal(action(pokemon("PIKACHU", "LIGHTBALL"), pokemon("EEVEE"), "Special").damageMultiplierInput.externalAttackMultiplier, 2);
assert.equal(action(pokemon("RAICHU", "LIGHTBALL"), pokemon("EEVEE"), "Physical").damageMultiplierInput.externalAttackMultiplier, 1);

for (const species of ["CUBONE", "MAROWAK"]) {
  assert.equal(action(pokemon(species, "THICKCLUB"), pokemon("EEVEE"), "Physical").damageMultiplierInput.externalAttackMultiplier, 2, species);
  assert.equal(action(pokemon(species, "THICKCLUB"), pokemon("EEVEE"), "Special").damageMultiplierInput.externalAttackMultiplier, 1, `${species} special`);
}

assert.equal(action(pokemon("CLAMPERL", "DEEPSEATOOTH"), pokemon("EEVEE"), "Special").damageMultiplierInput.externalAttackMultiplier, 2);
assert.equal(action(pokemon("CLAMPERL", "DEEPSEATOOTH"), pokemon("EEVEE"), "Physical").damageMultiplierInput.externalAttackMultiplier, 1);
assert.equal(action(pokemon("EEVEE", null), pokemon("CLAMPERL", "DEEPSEASCALE"), "Special").damageMultiplierInput.externalDefenseMultiplier, 2);
assert.equal(action(pokemon("EEVEE", null), pokemon("CLAMPERL", "DEEPSEASCALE"), "Physical").damageMultiplierInput.externalDefenseMultiplier, 1);

const consumedAlias = action(
  { species: "PIKACHU", ability: "NONE", held_item: null, item: "LIGHTBALL", hp: 100, max_hp: 100, status: "NONE" },
  pokemon("EEVEE"),
  "Physical",
);
assert.equal(consumedAlias.damageMultiplierInput.externalAttackMultiplier, 1, "held_item=null must suppress stale item alias");

const legacy = action(
  { species: "PIKACHU", ability_id: "NONE", item: "LIGHTBALL", hp: 100, max_hp: 100, status: "NONE" },
  pokemon("EEVEE"),
  "Physical",
);
assert.equal(legacy.damageMultiplierInput.externalAttackMultiplier, 2, "legacy Pokemon without held_item may use item alias");

const coverage = BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL;
for (const item of ["LIGHTBALL", "THICKCLUB", "DEEPSEATOOTH", "DEEPSEASCALE"]) assert.ok(coverage.itemIds.includes(item));
assert.equal(coverage.classificationCounts.speciesSpecificStatHeldItems, 4);

console.log("battle ability/item species-held-item smoke: PASS");
