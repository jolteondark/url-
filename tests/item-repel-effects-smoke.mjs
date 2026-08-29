import assert from "node:assert/strict";
import {
  REPEL_ITEM_EFFECT_SOURCE,
  REPEL_ITEM_EFFECTS,
  isRepelItem,
  resolveRepelItemEffect,
} from "../runtime/item-repel-effects.js";

assert.equal(REPEL_ITEM_EFFECT_SOURCE.essentialsVersion, "21.1");
assert.equal(REPEL_ITEM_EFFECT_SOURCE.canonicalVersion, "Mapless v0.9.108");

for (const [itemId, steps] of [["REPEL", 100], ["SUPERREPEL", 200], ["MAXREPEL", 250]]) {
  assert.equal(isRepelItem(itemId), true);
  assert.equal(REPEL_ITEM_EFFECTS[itemId].steps, steps);
  assert.deepEqual(resolveRepelItemEffect({ itemId, activeSteps: 0 }), {
    itemId,
    supported: true,
    used: true,
    result: "repel_started",
    kind: "repel",
    fieldUse: "Direct",
    activeSteps: steps,
  });
  assert.deepEqual(resolveRepelItemEffect({ itemId, activeSteps: 12.9 }), {
    itemId,
    supported: true,
    used: false,
    result: "repel_already_active",
    kind: "repel",
    fieldUse: "Direct",
    activeSteps: 12,
  });
}

assert.equal(isRepelItem("POTION"), false);
assert.deepEqual(resolveRepelItemEffect({ itemId: "POTION" }), {
  itemId: "POTION",
  supported: false,
  used: false,
  result: "unsupported_item",
});

console.log("item-repel-effects smoke: ok");
