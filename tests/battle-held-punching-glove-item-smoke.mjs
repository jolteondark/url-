import assert from "node:assert/strict";

import {
  BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL,
  resolveBattleAbilityItemHookCanonical,
} from "../runtime/battle-ability-item-hook-dispatch.js";
import {
  PUNCHING_MOVE_IDS_CANONICAL,
  moveIsPunchingCanonical,
  resolveHeldPunchingGlovePowerCanonical,
} from "../runtime/item-held-punching-glove-effects.js";

assert.equal(PUNCHING_MOVE_IDS_CANONICAL.length, 24);
assert.equal(moveIsPunchingCanonical({ id: "THUNDERPUNCH" }), true);
assert.equal(moveIsPunchingCanonical({ id: "JETPUNCH" }), true);
assert.equal(moveIsPunchingCanonical({ id: "HEADLONGRUSH" }), true);
assert.equal(moveIsPunchingCanonical({ id: "TACKLE" }), false);
assert.equal(moveIsPunchingCanonical({ id: "CUSTOM", flags: ["Contact", "Punching"] }), true);
assert.equal(moveIsPunchingCanonical({ id: "CUSTOM", Flags: "Contact,CanProtect,Punching" }), true);

assert.equal(resolveHeldPunchingGlovePowerCanonical({
  user: { held_item: "PUNCHINGGLOVE" },
  move: { id: "DRAINPUNCH" },
}).powerMultiplier, 1.1);
assert.equal(resolveHeldPunchingGlovePowerCanonical({
  user: { held_item: "PUNCHINGGLOVE" },
  move: { id: "TACKLE" },
}).powerMultiplier, 1);
assert.equal(resolveHeldPunchingGlovePowerCanonical({
  user: { held_item: "PUNCHINGGLOVE", ability_id: "KLUTZ" },
  move: { id: "DRAINPUNCH" },
}).powerMultiplier, 1);

const hooked = resolveBattleAbilityItemHookCanonical({
  hook: "action_before",
  user: { held_item: "PUNCHINGGLOVE" },
  target: {},
  move: { id: "DRAINPUNCH", type: "FIGHTING", category: "Physical", power: 75 },
  context: {},
});
assert.equal(hooked.userPunchingGlove.triggered, true);
assert.equal(hooked.modifiers.damageMultiplierInput.externalPowerMultiplier, 1.1);

const nonPunch = resolveBattleAbilityItemHookCanonical({
  hook: "action_before",
  user: { held_item: "PUNCHINGGLOVE" },
  target: {},
  move: { id: "TACKLE", type: "NORMAL", category: "Physical", power: 40 },
  context: {},
});
assert.equal(nonPunch.userPunchingGlove.triggered, false);
assert.equal(nonPunch.modifiers.damageMultiplierInput.externalPowerMultiplier, 1);

const klutz = resolveBattleAbilityItemHookCanonical({
  hook: "action_before",
  user: { held_item: "PUNCHINGGLOVE", ability_id: "KLUTZ" },
  target: {},
  move: { id: "DRAINPUNCH", type: "FIGHTING", category: "Physical", power: 75 },
  context: {},
});
assert.equal(klutz.modifiers.damageMultiplierInput.externalPowerMultiplier, 1);
assert.equal(BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL.itemIds.includes("PUNCHINGGLOVE"), true);

console.log("battle-held-punching-glove-item-smoke: ok");
