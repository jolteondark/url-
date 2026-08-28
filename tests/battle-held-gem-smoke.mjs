import assert from "node:assert/strict";
import {
  BATTLE_HELD_GEM_COVERAGE_CANONICAL,
  HELD_GEM_ITEM_IDS_CANONICAL,
  consumeHeldGemCanonical,
  resolveHeldGemPowerCanonical,
} from "../runtime/item-held-gem-effects.js";

assert.equal(HELD_GEM_ITEM_IDS_CANONICAL.length, 18);
assert.equal(BATTLE_HELD_GEM_COVERAGE_CANONICAL.itemCount, 18);
for (const item of ["NORMALGEM", "FIREGEM", "FAIRYGEM"]) assert.ok(HELD_GEM_ITEM_IDS_CANONICAL.includes(item));

const fire = resolveHeldGemPowerCanonical({
  user: { held_item: "FIREGEM", ability: "BLAZE" },
  move: { id: "FLAMETHROWER", type: "FIRE", category: "Special", power: 90, function_code: "None" },
});
assert.equal(fire.triggered, true);
assert.equal(fire.powerMultiplier, 1.3);
assert.equal(fire.consumeArmed, true);

assert.equal(resolveHeldGemPowerCanonical({
  user: { held_item: "FIREGEM" },
  move: { id: "SURF", type: "WATER", category: "Special", power: 90 },
}).triggered, false);
assert.equal(resolveHeldGemPowerCanonical({
  user: { held_item: "FIREGEM" },
  move: { id: "FIREPLEDGE", type: "FIRE", category: "Special", power: 80, function_code: "FirePledge" },
}).triggered, false);
assert.equal(resolveHeldGemPowerCanonical({
  user: { held_item: "FIREGEM", ability: "KLUTZ" },
  move: { id: "FLAMETHROWER", type: "FIRE", category: "Special", power: 90 },
}).triggered, false);

const consumed = consumeHeldGemCanonical({ held_item: "FIREGEM", item: "FIREGEM" }, fire);
assert.equal(consumed.consumed, true);
assert.equal(consumed.pokemon.held_item, null);
assert.equal(consumed.pokemon.item, null);
assert.equal(consumeHeldGemCanonical({ held_item: "WATERGEM" }, fire).consumed, false);
