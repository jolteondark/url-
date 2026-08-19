import assert from "node:assert/strict";
import { resolveAdditionalEffectChanceCanonical } from "../runtime/battle-core-seeded-secondary-effect.js";
import {
  BATTLE_ABILITY_ITEM_SHARED_HOOK_CONTRACT_CANONICAL,
  resolveBattleAbilityItemHookCanonical,
} from "../runtime/battle-ability-item-hook-dispatch.js";

const pokemon = (ability = "NONE", heldItem = null, extra = {}) => ({
  ability,
  held_item: heldItem,
  item: heldItem,
  status: "NONE",
  hp: 100,
  max_hp: 100,
  types: ["NORMAL"],
  stats: { ATTACK: 100, DEFENSE: 100, SPECIAL_ATTACK: 100, SPECIAL_DEFENSE: 100, SPEED: 100 },
  ...extra,
});

const tackle = { id: "BITE", type: "DARK", category: "Physical", power: 60, effect_chance: 30 };

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_before",
    user: pokemon("MOLDBREAKER"),
    target: pokemon("NONE", "COVERTCLOAK"),
    move: tackle,
  });
  assert.equal(result.modifiers.secondaryEffectInput.targetHasCovertCloak, true);
  assert.equal(result.modifiers.secondaryEffectInput.targetHasShieldDust, true);
  assert.equal(result.modifiers.secondaryEffectInput.moldBreaker, false,
    "Covert Cloak must remain an item-based secondary-effect block under Mold Breaker");
  assert.equal(resolveAdditionalEffectChanceCanonical({
    effectChance: 30,
    ...result.modifiers.secondaryEffectInput,
  }), 0);
}

{
  const shieldDust = resolveBattleAbilityItemHookCanonical({
    hook: "action_before",
    user: pokemon("MOLDBREAKER"),
    target: pokemon("SHIELDDUST"),
    move: tackle,
  });
  assert.equal(shieldDust.modifiers.secondaryEffectInput.targetHasCovertCloak, false);
  assert.equal(shieldDust.modifiers.secondaryEffectInput.targetHasShieldDust, true);
  assert.equal(shieldDust.modifiers.secondaryEffectInput.moldBreaker, true,
    "Mold Breaker must continue to bypass Shield Dust");
  assert.equal(resolveAdditionalEffectChanceCanonical({
    effectChance: 30,
    ...shieldDust.modifiers.secondaryEffectInput,
  }), 30);
}

{
  const consumed = pokemon("NONE", null, { item: "COVERTCLOAK" });
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_before",
    user: pokemon("NONE"),
    target: consumed,
    move: tackle,
  });
  assert.equal(result.modifiers.secondaryEffectInput.targetHasCovertCloak, false,
    "held_item=null must suppress a stale compatibility alias");
}

assert.ok(BATTLE_ABILITY_ITEM_SHARED_HOOK_CONTRACT_CANONICAL.implementedCoverage.itemIds.includes("COVERTCLOAK"));
assert.equal(
  BATTLE_ABILITY_ITEM_SHARED_HOOK_CONTRACT_CANONICAL.implementedCoverage.classificationCounts.normalPlayExtension.secondaryEffectSuppressionHeldItems,
  1,
);

console.log("battle Covert Cloak secondary-effect smoke: PASS");
