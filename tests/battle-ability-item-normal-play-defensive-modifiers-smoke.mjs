import assert from "node:assert/strict";
import {
  BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL,
  resolveNormalPlayActionBeforeAbilityItemExtensionCanonical,
} from "../runtime/battle-core-ability-item-normal-play-extension.js";

const pokemon = ({ ability = "NONE", heldItem = null, hp = 100, maxHp = 100, legacyAbility = undefined, legacyItem = undefined } = {}) => ({
  ability,
  held_item: heldItem,
  ...(legacyAbility === undefined ? {} : { ability_id: legacyAbility }),
  ...(legacyItem === undefined ? {} : { item: legacyItem }),
  hp,
  max_hp: maxHp,
});

const physicalMove = { id: "TACKLE", type: "NORMAL", category: "Physical", power: 40 };
const specialMove = { id: "WATERGUN", type: "WATER", category: "Special", power: 40 };

{
  const result = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: pokemon({ heldItem: "MUSCLEBAND" }), target: pokemon(), move: physicalMove,
  });
  assert.equal(result.damageMultiplierInput.externalPowerMultiplier, 1.1);
}

{
  const result = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: pokemon({ heldItem: "WISEGLASSES" }), target: pokemon(), move: specialMove,
  });
  assert.equal(result.damageMultiplierInput.externalPowerMultiplier, 1.1);
}

{
  const result = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: pokemon(), target: pokemon({ ability: "MULTISCALE", hp: 120, maxHp: 120 }), move: physicalMove,
  });
  assert.equal(result.damageMultiplierInput.externalFinalDamageMultiplier, 0.5);
}

{
  const result = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: pokemon({ ability: "MOLDBREAKER" }), target: pokemon({ ability: "MULTISCALE", hp: 120, maxHp: 120 }), move: physicalMove,
  });
  assert.equal(result.damageMultiplierInput.externalFinalDamageMultiplier, 1);
}

{
  const result = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: pokemon({ ability: "MOLDBREAKER" }), target: pokemon({ ability: "SHADOWSHIELD", hp: 120, maxHp: 120 }), move: physicalMove,
  });
  assert.equal(result.damageMultiplierInput.externalFinalDamageMultiplier, 0.5);
}

{
  const result = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: pokemon(), target: pokemon({ ability: "SHADOWSHIELD", hp: 119, maxHp: 120 }), move: physicalMove,
  });
  assert.equal(result.damageMultiplierInput.externalFinalDamageMultiplier, 1);
}

{
  const staleItem = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: pokemon({ heldItem: null, legacyItem: "MUSCLEBAND" }), target: pokemon(), move: physicalMove,
  });
  assert.equal(staleItem.damageMultiplierInput.externalPowerMultiplier, 1);
  const staleAbility = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: pokemon(), target: pokemon({ ability: null, legacyAbility: "MULTISCALE", hp: 120, maxHp: 120 }), move: physicalMove,
  });
  assert.equal(staleAbility.damageMultiplierInput.externalFinalDamageMultiplier, 1);
}

assert.ok(BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL.abilityIds.includes("MULTISCALE"));
assert.ok(BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL.abilityIds.includes("SHADOWSHIELD"));
assert.ok(BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL.itemIds.includes("MUSCLEBAND"));
assert.ok(BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL.itemIds.includes("WISEGLASSES"));
assert.equal(BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL.classificationCounts.fullHpDamageReductionAbilities, 2);
assert.equal(BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL.classificationCounts.categoryBoostHeldItems, 2);

console.log("battle ability/item normal-play defensive modifiers smoke: PASS");
