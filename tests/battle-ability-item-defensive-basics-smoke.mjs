import assert from "node:assert/strict";
import {
  BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL,
  resolveNormalPlayActionBeforeAbilityItemExtensionCanonical,
} from "../runtime/battle-core-ability-item-normal-play-extension.js";
import { resolveBattleAbilityItemHookCanonical } from "../runtime/battle-ability-item-hook-dispatch.js";

function pokemon(ability, extra = {}) {
  return {
    ability,
    held_item: null,
    hp: 100,
    max_hp: 100,
    status: "NONE",
    ...extra,
  };
}

function finalDamageMultiplier({ userAbility = "NONE", targetAbility, type = "NORMAL", contact = false }) {
  return resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
    user: pokemon(userAbility),
    target: pokemon(targetAbility),
    move: { id: "TESTMOVE", type, category: "Physical", power: 80 },
    context: { contact, typeMod: 1 },
  }).damageMultiplierInput.externalFinalDamageMultiplier;
}

assert.equal(finalDamageMultiplier({ targetAbility: "FLUFFY", contact: true }), 0.5);
assert.equal(finalDamageMultiplier({ targetAbility: "FLUFFY", type: "FIRE", contact: false }), 2);
assert.equal(finalDamageMultiplier({ targetAbility: "FLUFFY", type: "FIRE", contact: true }), 1);
assert.equal(finalDamageMultiplier({ userAbility: "LONGREACH", targetAbility: "FLUFFY", type: "FIRE", contact: true }), 2);
assert.equal(finalDamageMultiplier({ userAbility: "MOLDBREAKER", targetAbility: "FLUFFY", contact: true }), 1);

assert.equal(finalDamageMultiplier({ targetAbility: "PURIFYINGSALT", type: "GHOST" }), 0.5);
assert.equal(finalDamageMultiplier({ targetAbility: "PURIFYINGSALT", type: "NORMAL" }), 1);
assert.equal(finalDamageMultiplier({ userAbility: "MOLDBREAKER", targetAbility: "PURIFYINGSALT", type: "GHOST" }), 1);

const shared = resolveBattleAbilityItemHookCanonical({
  hook: "action_before",
  user: pokemon("NONE"),
  target: pokemon("PURIFYINGSALT"),
  move: { id: "SHADOWBALL", type: "GHOST", category: "Special", power: 80 },
  context: { typeMod: 1 },
});
assert.equal(shared.modifiers.damageMultiplierInput.externalFinalDamageMultiplier, 0.5);

const staleAbility = resolveNormalPlayActionBeforeAbilityItemExtensionCanonical({
  user: pokemon("NONE"),
  target: { ability: null, ability_id: "FLUFFY", held_item: null, hp: 100, max_hp: 100, status: "NONE" },
  move: { id: "TACKLE", type: "NORMAL", category: "Physical", power: 40 },
  context: { contact: true, typeMod: 1 },
});
assert.equal(staleAbility.damageMultiplierInput.externalFinalDamageMultiplier, 1);

assert.ok(BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL.abilityIds.includes("FLUFFY"));
assert.ok(BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL.abilityIds.includes("PURIFYINGSALT"));
assert.equal(BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL.classificationCounts.contactDamageModifierAbilities, 1);
assert.equal(BATTLE_ABILITY_ITEM_NORMAL_PLAY_EXTENSION_COVERAGE_CANONICAL.classificationCounts.typeDamageReductionAbilities >= 1, true);

console.log("battle ability/item defensive basics smoke: PASS");
