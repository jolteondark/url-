import assert from "node:assert/strict";
import {
  HELD_LEGENDARY_BOOST_ITEM_IDS_CANONICAL,
  resolveHeldLegendaryBoostCanonical,
} from "../runtime/item-held-legendary-boost-effects.js";
import { resolveBattleAbilityItemHookCanonical } from "../runtime/battle-ability-item-hook-dispatch.js";

assert.deepEqual(HELD_LEGENDARY_BOOST_ITEM_IDS_CANONICAL, [
  "ADAMANTCRYSTAL", "ADAMANTORB", "GRISEOUSCORE", "GRISEOUSORB",
  "LUSTROUSGLOBE", "LUSTROUSORB", "SOULDEW",
]);

let resolved = resolveHeldLegendaryBoostCanonical({
  user: { species: "DIALGA", held_item: "ADAMANTORB" },
  move: { type: "DRAGON" },
});
assert.equal(resolved.triggered, true);
assert.equal(resolved.powerMultiplier, 1.2);
assert.equal(resolved.finalDamageMultiplier, 1);

resolved = resolveHeldLegendaryBoostCanonical({
  user: { species: "PALKIA", held_item: "LUSTROUSGLOBE" },
  move: { type: "FIRE" },
});
assert.equal(resolved.triggered, false);

resolved = resolveHeldLegendaryBoostCanonical({
  user: { species: "LATIOS", held_item: "SOULDEW" },
  move: { type: "PSYCHIC" },
});
assert.equal(resolved.triggered, true);
assert.equal(resolved.powerMultiplier, 1);
assert.equal(resolved.finalDamageMultiplier, 1.2);

resolved = resolveHeldLegendaryBoostCanonical({
  user: { species: "GIRATINA", held_item: "GRISEOUSCORE", ability: "KLUTZ" },
  move: { type: "GHOST" },
});
assert.equal(resolved.item, null);
assert.equal(resolved.triggered, false);

const adamantHook = resolveBattleAbilityItemHookCanonical({
  hook: "action_before",
  user: { species: "DIALGA", held_item: "ADAMANTCRYSTAL", ability: "PRESSURE" },
  target: { species: "BIDOOF", held_item: null, ability: "SIMPLE" },
  move: { id: "DRAGONPULSE", type: "DRAGON", category: "Special", function_code: "None" },
  context: { typeMod: 1 },
});
assert.equal(adamantHook.userLegendaryHeldBoost.triggered, true);
assert.equal(adamantHook.modifiers.damageMultiplierInput.externalPowerMultiplier, 1.2);

const soulDewHook = resolveBattleAbilityItemHookCanonical({
  hook: "action_before",
  user: { species: "LATIAS", held_item: "SOULDEW", ability: "LEVITATE" },
  target: { species: "BIDOOF", held_item: null, ability: "SIMPLE" },
  move: { id: "PSYCHIC", type: "PSYCHIC", category: "Special", function_code: "None" },
  context: { typeMod: 1 },
});
assert.equal(soulDewHook.userLegendaryHeldBoost.triggered, true);
assert.equal(soulDewHook.modifiers.damageMultiplierInput.externalFinalDamageMultiplier, 1.2);
