import assert from "node:assert/strict";
import {
  BATTLE_HIT_REACTIVE_HELD_ITEM_COVERAGE_CANONICAL,
  resolveHitReactiveHeldItemActionAfterCanonical,
} from "../runtime/battle-core-hit-reactive-held-item-extension.js";

function pokemon(heldItem, extra = {}) {
  return {
    ability: "NONE",
    held_item: heldItem,
    item: heldItem,
    hp: 100,
    max_hp: 100,
    ...extra,
  };
}

function resolve(item, move, context = {}, extra = {}) {
  return resolveHitReactiveHeldItemActionAfterCanonical({
    target: pokemon(item, extra.target ?? {}),
    move,
    damageDealt: extra.damageDealt ?? 20,
    context,
  });
}

{
  const result = resolve(
    "WEAKNESSPOLICY",
    { id: "FLAMETHROWER", type: "FIRE", category: "Special", function_code: "BurnTarget" },
    { typeMod: 2, targetStatStages: { ATTACK: 0, SPECIAL_ATTACK: 0 } },
  );
  assert.equal(result.triggered, true);
  assert.deepEqual(result.statChanges, [
    { subject: "target", stat: "ATTACK", delta: 2 },
    { subject: "target", stat: "SPECIAL_ATTACK", delta: 2 },
  ]);
  assert.equal(result.consumeRequest.item, "WEAKNESSPOLICY");
  assert.equal(result.consumeRequest.permanent, true);
}

{
  const result = resolve(
    "WEAKNESSPOLICY",
    { id: "SEISMICTOSS", type: "FIGHTING", category: "Physical", function_code: "FixedDamageUserLevel" },
    { typeMod: 2 },
  );
  assert.equal(result.triggered, false);
  assert.equal(result.consumeRequest, null);
}

{
  const result = resolve(
    "WEAKNESSPOLICY",
    { id: "FLAMETHROWER", type: "FIRE", category: "Special", function_code: "BurnTarget" },
    { typeMod: 2, targetStatStages: { ATTACK: 6, SPECIAL_ATTACK: 6 } },
  );
  assert.equal(result.triggered, false);
}

for (const fixture of [
  ["ABSORBBULB", "WATER", "SPECIAL_ATTACK", 1],
  ["CELLBATTERY", "ELECTRIC", "ATTACK", 1],
  ["LUMINOUSMOSS", "WATER", "SPECIAL_DEFENSE", 1],
  ["SNOWBALL", "ICE", "ATTACK", 1],
]) {
  const [item, type, stat, delta] = fixture;
  const result = resolve(item, { id: "TESTMOVE", type, category: "Special", function_code: "None" }, { targetStatStages: { [stat]: 0 } });
  assert.equal(result.triggered, true, item);
  assert.deepEqual(result.statChanges, [{ subject: "target", stat, delta }], item);
  assert.equal(result.consumeRequest.item, item);
  assert.equal(result.consumeRequest.permanent, true);
}

{
  const result = resolve("CELLBATTERY", { id: "THUNDERSHOCK", type: "ELECTRIC", category: "Special", function_code: "ParalyzeTarget" }, {}, { damageDealt: 0 });
  assert.equal(result.triggered, false);
}

{
  const result = resolve("ABSORBBULB", { id: "WATERGUN", type: "WATER", category: "Special", function_code: "None" }, { targetStatStages: { SPECIAL_ATTACK: 6 } });
  assert.equal(result.triggered, false);
}

{
  const target = { ability: "NONE", held_item: null, item: "WEAKNESSPOLICY", hp: 100, max_hp: 100 };
  const result = resolveHitReactiveHeldItemActionAfterCanonical({
    target,
    move: { id: "FLAMETHROWER", type: "FIRE", category: "Special", function_code: "BurnTarget" },
    damageDealt: 20,
    context: { typeMod: 2 },
  });
  assert.equal(result.triggered, false);
  assert.equal(result.item, "");
}

{
  const legacyTarget = { ability_id: "NONE", item: "SNOWBALL", hp: 100, max_hp: 100 };
  const result = resolveHitReactiveHeldItemActionAfterCanonical({
    target: legacyTarget,
    move: { id: "ICEBEAM", type: "ICE", category: "Special", function_code: "FreezeTarget" },
    damageDealt: 20,
  });
  assert.equal(result.triggered, true);
}

assert.equal(BATTLE_HIT_REACTIVE_HELD_ITEM_COVERAGE_CANONICAL.itemCount, 5);
assert.equal(BATTLE_HIT_REACTIVE_HELD_ITEM_COVERAGE_CANONICAL.classificationCounts.superEffectiveStatItems, 1);
assert.equal(BATTLE_HIT_REACTIVE_HELD_ITEM_COVERAGE_CANONICAL.classificationCounts.typeHitStatItems, 4);

console.log("battle hit-reactive held-item smoke: PASS");
