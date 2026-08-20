import assert from "node:assert/strict";
import {
  BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL,
  resolveBattleAbilityItemHookCanonical,
} from "../runtime/battle-ability-item-hook-dispatch.js";

const pokemon = (heldItem, extra = {}) => ({
  ability: "NONE",
  held_item: heldItem,
  item: heldItem,
  hp: 50,
  max_hp: 100,
  status: "NONE",
  ...extra,
});

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_after",
    user: pokemon("SHELLBELL"),
    target: pokemon(null),
    move: { id: "TACKLE", category: "Physical" },
    damageDealt: 40,
  });
  assert.equal(result.userShellBell.triggered, true);
  assert.equal(result.userShellBell.heal, 5);
  assert.equal(result.userShellBell.hpDelta, 5);
  assert.equal(result.userShellBell.item, "SHELLBELL");
}

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_after",
    user: pokemon("SHELLBELL"),
    target: pokemon(null),
    move: { id: "TACKLE", category: "Physical" },
    damageDealt: 1,
  });
  assert.equal(result.userShellBell.heal, 1);
}

for (const damageDealt of [0, -1]) {
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_after",
    user: pokemon("SHELLBELL"),
    target: pokemon(null),
    move: { id: "TACKLE", category: "Physical" },
    damageDealt,
  });
  assert.equal(result.userShellBell.triggered, false);
  assert.equal(result.userShellBell.heal, 0);
}

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_after",
    user: pokemon("SHELLBELL", { hp: 100 }),
    target: pokemon(null),
    move: { id: "TACKLE", category: "Physical" },
    damageDealt: 80,
  });
  assert.equal(result.userShellBell.triggered, false);
}

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_after",
    user: pokemon("SHELLBELL"),
    target: pokemon(null),
    move: { id: "BODYSLAM", category: "Physical", effect_chance: 30 },
    damageDealt: 80,
    context: { sheerForceBoosted: true },
  });
  assert.equal(result.userShellBell.triggered, false);
  assert.equal(result.userShellBell.reason, "sheer_force");
}

{
  const stale = pokemon("SHELLBELL");
  stale.held_item = null;
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_after",
    user: stale,
    target: pokemon(null),
    damageDealt: 80,
  });
  assert.equal(result.userShellBell.triggered, false);
}

assert.ok(BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL.itemIds.includes("SHELLBELL"));
assert.equal(
  BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL.classificationCounts.shellBellExtension.actionAfterHealingHeldItems,
  1,
);

console.log("battle Shell Bell shared hook smoke: PASS");
