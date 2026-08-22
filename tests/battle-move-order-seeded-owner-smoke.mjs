import assert from "node:assert/strict";
import { resolveSeededMoveOrderAbilityItemExtensionCanonical } from "../runtime/battle-core-ability-item-move-order-extension.js";

function pokemon({ ability = null, heldItem = null, hp = 100, maxHp = 100 } = {}) {
  return { ability, held_item: heldItem, hp, max_hp: maxHp };
}
function move({ category = "Physical", priority = 0 } = {}) {
  return { id: "TACKLE", category, priority };
}

{
  const result = resolveSeededMoveOrderAbilityItemExtensionCanonical({
    user: pokemon({ ability: "QUICKDRAW" }),
    move: move(),
    randomSeed: 3,
  });
  assert.equal(result.source, "QUICKDRAW");
  assert.equal(result.forceFirstWithinPriority, true);
  assert.equal(result.abilityChanceRequest.roll, 24);
  assert.equal(result.seededMoveOrderRolls.length, 1);
  assert.deepEqual(result.seededMoveOrderRolls[0], { source: "QUICKDRAW", limit: 100, value: 24 });
}

{
  const result = resolveSeededMoveOrderAbilityItemExtensionCanonical({
    user: pokemon({ heldItem: "QUICKCLAW" }),
    move: move(),
    randomSeed: 1,
  });
  assert.equal(result.source, null);
  assert.equal(result.itemChanceRequest.roll, 37);
  assert.equal(result.seededMoveOrderRolls.length, 1);

  const triggered = resolveSeededMoveOrderAbilityItemExtensionCanonical({
    user: pokemon({ heldItem: "QUICKCLAW" }),
    move: move(),
    randomSeed: 3,
  });
  assert.equal(triggered.source, null, "seed 3 first roll belongs to Quick Claw and is 24, so it must not trigger");

  const triggeredSeed = resolveSeededMoveOrderAbilityItemExtensionCanonical({
    user: pokemon({ heldItem: "QUICKCLAW" }),
    move: move(),
    randomSeed: 10,
  });
  assert.equal(triggeredSeed.source, "QUICKCLAW");
  assert.equal(triggeredSeed.itemChanceRequest.roll, 9);
}

{
  const result = resolveSeededMoveOrderAbilityItemExtensionCanonical({
    user: pokemon({ ability: "QUICKDRAW", heldItem: "QUICKCLAW" }),
    move: move(),
    randomSeed: 3,
  });
  assert.equal(result.source, "QUICKDRAW");
  assert.equal(result.seededMoveOrderRolls.length, 1, "Quick Claw must not consume a roll after Quick Draw succeeds");
}

{
  const result = resolveSeededMoveOrderAbilityItemExtensionCanonical({
    user: pokemon({ ability: "QUICKDRAW", heldItem: "QUICKCLAW" }),
    move: move(),
    randomSeed: 1,
  });
  assert.equal(result.source, "QUICKCLAW");
  assert.equal(result.abilityChanceRequest.roll, 37);
  assert.equal(result.itemChanceRequest.roll, 12);
  assert.deepEqual(result.seededMoveOrderRolls, [
    { source: "QUICKDRAW", limit: 100, value: 37 },
    { source: "QUICKCLAW", limit: 100, value: 12 },
  ]);
}

{
  const result = resolveSeededMoveOrderAbilityItemExtensionCanonical({
    user: pokemon({ ability: "QUICKDRAW" }),
    move: move({ category: "Status" }),
    randomSeed: 3,
  });
  assert.equal(result.forceFirstWithinPriority, false);
  assert.equal(result.seededMoveOrderRolls.length, 0, "ineligible Quick Draw must not consume RNG");
}

{
  const result = resolveSeededMoveOrderAbilityItemExtensionCanonical({
    user: pokemon({ heldItem: "CUSTAPBERRY", hp: 20, maxHp: 100 }),
    move: move(),
    randomSeed: 3,
  });
  assert.equal(result.source, "CUSTAPBERRY");
  assert.equal(result.consumeRequest?.permanent, true);
  assert.equal(result.seededMoveOrderRolls.length, 0, "Custap is threshold-driven and must not consume move-order RNG");
}

{
  const first = resolveSeededMoveOrderAbilityItemExtensionCanonical({
    user: pokemon({ ability: "QUICKDRAW", heldItem: "QUICKCLAW" }),
    move: move(),
    randomSeed: 17,
  });
  const second = resolveSeededMoveOrderAbilityItemExtensionCanonical({
    user: pokemon({ ability: "QUICKDRAW", heldItem: "QUICKCLAW" }),
    move: move(),
    randomSeed: 17,
  });
  assert.deepEqual(second, first, "same seed must reproduce the same move-order result");
}

console.log("battle seeded move-order owner smoke: PASS");
