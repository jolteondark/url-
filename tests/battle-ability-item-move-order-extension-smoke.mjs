import assert from "node:assert/strict";
import { calculatePriorityCanonical } from "../runtime/battle-core-priority.js";
import {
  BATTLE_MOVE_ORDER_EXTENSION_COVERAGE_CANONICAL,
  resolveMoveOrderAbilityItemExtensionCanonical,
} from "../runtime/battle-core-ability-item-move-order-extension.js";

function pokemon(ability = null, heldItem = null, extra = {}) {
  return { ability, held_item: heldItem, hp: 100, max_hp: 100, ...extra };
}

{
  const result = resolveMoveOrderAbilityItemExtensionCanonical({
    user: pokemon("STALL", null),
    move: { id: "TACKLE", category: "Physical", priority: 0 },
  });
  assert.equal(result.forceLastWithinPriority, true);
  assert.equal(result.source, "STALL");
  assert.equal(result.abilitySubPriority, -1);
  assert.equal(result.itemSubPriority, 0);
  assert.equal(result.priorityDelta, 0);
}

for (const item of ["LAGGINGTAIL", "FULLINCENSE"]) {
  const result = resolveMoveOrderAbilityItemExtensionCanonical({
    user: pokemon(null, item),
    move: { id: "TACKLE", category: "Physical", priority: 0 },
  });
  assert.equal(result.forceLastWithinPriority, true, item);
  assert.equal(result.source, item);
  assert.equal(result.itemSubPriority, -1);
  assert.equal(result.priorityDelta, 0);
}

{
  const status = resolveMoveOrderAbilityItemExtensionCanonical({
    user: pokemon("MYCELIUMMIGHT", null),
    move: { id: "SPORE", category: "Status", priority: 0 },
  });
  assert.equal(status.forceLastWithinPriority, true);
  assert.equal(status.abilitySubPriority, -1);
  const damaging = resolveMoveOrderAbilityItemExtensionCanonical({
    user: pokemon("MYCELIUMMIGHT", null),
    move: { id: "TACKLE", category: "Physical", priority: 0 },
  });
  assert.equal(damaging.forceLastWithinPriority, false);
}

{
  const quickDraw = resolveMoveOrderAbilityItemExtensionCanonical({
    user: pokemon("QUICKDRAW", null),
    move: { id: "TACKLE", category: "Physical", priority: 0 },
    abilityRandomRoll: 29,
  });
  assert.equal(quickDraw.forceFirstWithinPriority, true);
  assert.equal(quickDraw.abilitySubPriority, 1);
  assert.equal(quickDraw.source, "QUICKDRAW");
  const miss = resolveMoveOrderAbilityItemExtensionCanonical({
    user: pokemon("QUICKDRAW", null),
    move: { id: "TACKLE", category: "Physical", priority: 0 },
    abilityRandomRoll: 30,
  });
  assert.equal(miss.forceFirstWithinPriority, false);
  const status = resolveMoveOrderAbilityItemExtensionCanonical({
    user: pokemon("QUICKDRAW", null),
    move: { id: "RECOVER", category: "Status", priority: 0 },
    abilityRandomRoll: 0,
  });
  assert.equal(status.forceFirstWithinPriority, false);
}

{
  const quickClaw = resolveMoveOrderAbilityItemExtensionCanonical({
    user: pokemon(null, "QUICKCLAW"),
    move: { id: "TACKLE", category: "Physical", priority: 0 },
    itemRandomRoll: 19,
  });
  assert.equal(quickClaw.forceFirstWithinPriority, true);
  assert.equal(quickClaw.itemSubPriority, 1);
  assert.equal(quickClaw.source, "QUICKCLAW");
  const miss = resolveMoveOrderAbilityItemExtensionCanonical({
    user: pokemon(null, "QUICKCLAW"),
    move: { id: "TACKLE", category: "Physical", priority: 0 },
    itemRandomRoll: 20,
  });
  assert.equal(miss.forceFirstWithinPriority, false);
}

{
  const custap = resolveMoveOrderAbilityItemExtensionCanonical({
    user: pokemon(null, "CUSTAPBERRY", { hp: 25, max_hp: 100 }),
    move: { id: "TACKLE", category: "Physical", priority: 0 },
  });
  assert.equal(custap.forceFirstWithinPriority, true);
  assert.equal(custap.itemSubPriority, 1);
  assert.equal(custap.source, "CUSTAPBERRY");
  assert.equal(custap.consumeRequest.item, "CUSTAPBERRY");
  assert.equal(custap.consumeRequest.permanent, true);
  const gluttony = resolveMoveOrderAbilityItemExtensionCanonical({
    user: pokemon("GLUTTONY", "CUSTAPBERRY", { hp: 50, max_hp: 100 }),
    move: { id: "TACKLE", category: "Physical", priority: 0 },
  });
  assert.equal(gluttony.forceFirstWithinPriority, true);
  const blocked = resolveMoveOrderAbilityItemExtensionCanonical({
    user: pokemon(null, "CUSTAPBERRY", { hp: 1, max_hp: 100 }),
    move: { id: "TACKLE", category: "Physical", priority: 0 },
    opposingHasUnnerve: true,
  });
  assert.equal(blocked.forceFirstWithinPriority, false);
  assert.equal(blocked.consumeRequest, null);
}

{
  const result = resolveMoveOrderAbilityItemExtensionCanonical({
    user: pokemon("STALL", null),
    move: { id: "QUICKATTACK", category: "Physical", priority: 1 },
  });
  assert.equal(result.forceLastWithinPriority, true);
  assert.equal(result.movePriority, 1);
  assert.equal(result.priorityDelta, 0);
}

{
  const mixed = resolveMoveOrderAbilityItemExtensionCanonical({
    user: pokemon("STALL", "QUICKCLAW"),
    move: { id: "TACKLE", category: "Physical", priority: 0 },
    itemRandomRoll: 0,
  });
  assert.equal(mixed.abilitySubPriority, -1);
  assert.equal(mixed.itemSubPriority, 1);
  const order = calculatePriorityCanonical([
    { actionIndex: 0, battlerIndex: 0, speed: 1, movePriority: 0, abilitySubPriority: mixed.abilitySubPriority, itemSubPriority: mixed.itemSubPriority, tieBreaker: 0 },
    { actionIndex: 1, battlerIndex: 1, speed: 200, movePriority: 0, tieBreaker: 1 },
  ]).order;
  assert.deepEqual(order, [0, 1]);
}

{
  const stale = resolveMoveOrderAbilityItemExtensionCanonical({
    user: { ability: null, ability_id: "QUICKDRAW", held_item: null, item: "QUICKCLAW", hp: 1, max_hp: 100 },
    move: { category: "Physical", priority: 0 },
    abilityRandomRoll: 0,
    itemRandomRoll: 0,
  });
  assert.equal(stale.forceFirstWithinPriority, false);
  assert.equal(stale.forceLastWithinPriority, false);
  assert.equal(stale.source, null);
}

{
  const legacy = resolveMoveOrderAbilityItemExtensionCanonical({
    user: { ability_id: "STALL", item: "LAGGINGTAIL", hp: 100, max_hp: 100 },
    move: { category: "Physical", priority: 0 },
  });
  assert.equal(legacy.forceLastWithinPriority, true);
  assert.equal(legacy.source, "LAGGINGTAIL");
}

{
  const suppressed = resolveMoveOrderAbilityItemExtensionCanonical({
    user: pokemon(null, "QUICKCLAW", { held_item_effect_suppressed: true }),
    move: { category: "Physical", priority: 0 },
    itemRandomRoll: 0,
  });
  assert.equal(suppressed.forceFirstWithinPriority, false);
}

assert.deepEqual(BATTLE_MOVE_ORDER_EXTENSION_COVERAGE_CANONICAL.abilityIds, ["MYCELIUMMIGHT", "QUICKDRAW", "STALL"]);
assert.deepEqual(BATTLE_MOVE_ORDER_EXTENSION_COVERAGE_CANONICAL.itemIds, ["CUSTAPBERRY", "FULLINCENSE", "LAGGINGTAIL", "QUICKCLAW"]);
assert.equal(BATTLE_MOVE_ORDER_EXTENSION_COVERAGE_CANONICAL.classificationCounts.moveLastWithinPriorityAbilities, 2);
assert.equal(BATTLE_MOVE_ORDER_EXTENSION_COVERAGE_CANONICAL.classificationCounts.moveLastWithinPriorityHeldItems, 2);
assert.equal(BATTLE_MOVE_ORDER_EXTENSION_COVERAGE_CANONICAL.classificationCounts.probabilisticMoveFirstAbilities, 1);
assert.equal(BATTLE_MOVE_ORDER_EXTENSION_COVERAGE_CANONICAL.classificationCounts.probabilisticMoveFirstHeldItems, 1);
assert.equal(BATTLE_MOVE_ORDER_EXTENSION_COVERAGE_CANONICAL.classificationCounts.pinchMoveFirstBerries, 1);

console.log("battle ability/item move-order extension smoke: PASS");
