import assert from "node:assert/strict";
import {
  BATTLE_MOVE_ORDER_EXTENSION_COVERAGE_CANONICAL,
  resolveMoveOrderAbilityItemExtensionCanonical,
} from "../runtime/battle-core-ability-item-move-order-extension.js";

function pokemon(ability = null, heldItem = null, extra = {}) {
  return { ability, held_item: heldItem, ...extra };
}

{
  const result = resolveMoveOrderAbilityItemExtensionCanonical({
    user: pokemon("STALL", null),
    move: { id: "TACKLE", priority: 0 },
  });
  assert.equal(result.forceLastWithinPriority, true);
  assert.equal(result.source, "STALL");
  assert.equal(result.priorityDelta, 0);
}

for (const item of ["LAGGINGTAIL", "FULLINCENSE"]) {
  const result = resolveMoveOrderAbilityItemExtensionCanonical({
    user: pokemon(null, item),
    move: { id: "TACKLE", priority: 0 },
  });
  assert.equal(result.forceLastWithinPriority, true, item);
  assert.equal(result.source, item);
  assert.equal(result.priorityDelta, 0);
}

{
  const result = resolveMoveOrderAbilityItemExtensionCanonical({
    user: pokemon("STALL", null),
    move: { id: "QUICKATTACK", priority: 1 },
  });
  assert.equal(result.forceLastWithinPriority, true);
  assert.equal(result.movePriority, 1);
  assert.equal(result.priorityDelta, 0);
}

{
  const result = resolveMoveOrderAbilityItemExtensionCanonical({
    user: pokemon("STALL", "LAGGINGTAIL"),
    move: { id: "TACKLE", priority: 0 },
  });
  assert.equal(result.forceLastWithinPriority, true);
  assert.equal(result.source, "LAGGINGTAIL");
}

{
  const stale = resolveMoveOrderAbilityItemExtensionCanonical({
    user: { ability: null, ability_id: "STALL", held_item: null, item: "LAGGINGTAIL" },
    move: { priority: 0 },
  });
  assert.equal(stale.forceLastWithinPriority, false);
  assert.equal(stale.source, null);
}

{
  const legacy = resolveMoveOrderAbilityItemExtensionCanonical({
    user: { ability_id: "STALL", item: "LAGGINGTAIL" },
    move: { priority: 0 },
  });
  assert.equal(legacy.forceLastWithinPriority, true);
  assert.equal(legacy.source, "LAGGINGTAIL");
}

{
  const suppressed = resolveMoveOrderAbilityItemExtensionCanonical({
    user: pokemon(null, "LAGGINGTAIL", { held_item_effect_suppressed: true }),
    move: { priority: 0 },
  });
  assert.equal(suppressed.forceLastWithinPriority, false);
}

assert.deepEqual(BATTLE_MOVE_ORDER_EXTENSION_COVERAGE_CANONICAL.abilityIds, ["STALL"]);
assert.deepEqual(BATTLE_MOVE_ORDER_EXTENSION_COVERAGE_CANONICAL.itemIds, ["FULLINCENSE", "LAGGINGTAIL"]);
assert.equal(BATTLE_MOVE_ORDER_EXTENSION_COVERAGE_CANONICAL.classificationCounts.moveLastWithinPriorityAbilities, 1);
assert.equal(BATTLE_MOVE_ORDER_EXTENSION_COVERAGE_CANONICAL.classificationCounts.moveLastWithinPriorityHeldItems, 2);

console.log("battle ability/item move-order extension smoke: PASS");
