import assert from "node:assert/strict";
import { resolveBattleAbilityItemHookCanonical } from "../runtime/battle-ability-item-hook-dispatch.js";

function actionAfterFor(target) {
  return resolveBattleAbilityItemHookCanonical({
    hook: "action_after",
    user: { hp: 100, max_hp: 100, ability: "NONE", held_item: null },
    target,
    move: { id: "TACKLE", type: "NORMAL", category: "Physical", power: 40 },
    damageDealt: 20,
    context: {},
  });
}

{
  const resolved = actionAfterFor({ hp: 40, max_hp: 100, ability: "RIPEN", held_item: "BERRYJUICE" });
  assert.equal(resolved.targetBerry.triggered, true);
  assert.equal(resolved.targetBerry.heal, 20);
  assert.equal(resolved.targetBerry.consumeRequest.item, "BERRYJUICE");
  assert.equal(resolved.targetBerry.consumeRequest.itemIsBerry, false);
  assert.equal(resolved.targetBerry.consumeRequest.permanent, true);
}

{
  const resolved = actionAfterFor({ hp: 51, max_hp: 100, ability: "NONE", held_item: "BERRYJUICE" });
  assert.notEqual(resolved.targetBerry?.triggered, true);
}

{
  const resolved = actionAfterFor({ hp: 40, max_hp: 100, ability: "RIPEN", held_item: "ORANBERRY" });
  assert.equal(resolved.targetBerry.triggered, true);
  assert.equal(resolved.targetBerry.heal, 20);
  assert.equal(resolved.targetBerry.consumeRequest.itemIsBerry, true);
}

{
  const resolved = actionAfterFor({ hp: 40, max_hp: 100, ability: "RIPEN", held_item: "SITRUSBERRY" });
  assert.equal(resolved.targetBerry.triggered, true);
  assert.equal(resolved.targetBerry.heal, 50);
  assert.equal(resolved.targetBerry.consumeRequest.itemIsBerry, true);
}

console.log("held HP threshold consumable smoke: ok");
