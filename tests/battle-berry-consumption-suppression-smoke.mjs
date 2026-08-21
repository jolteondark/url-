import assert from "node:assert/strict";
import {
  applyBerryConsumptionSuppressionCanonical,
  BATTLE_BERRY_CONSUMPTION_SUPPRESSION_COVERAGE_CANONICAL,
  resolveBerryConsumptionSuppressionCanonical,
} from "../runtime/battle-core-berry-consumption-suppression-extension.js";
import { resolveBattleAbilityItemHookCanonical } from "../runtime/battle-ability-item-hook-dispatch.js";

const pokemon = (ability = "NONE", heldItem = null, extra = {}) => ({
  ability,
  held_item: heldItem,
  item: heldItem,
  status: "NONE",
  hp: 100,
  max_hp: 100,
  types: ["NORMAL"],
  ...extra,
});

{
  const result = resolveBerryConsumptionSuppressionCanonical({
    consumer: pokemon("NONE", "SITRUSBERRY", { hp: 25 }),
    opposing: pokemon("UNNERVE"),
  });
  assert.equal(result.blocked, true);
  assert.equal(result.source, "UNNERVE");
}

{
  const result = resolveBerryConsumptionSuppressionCanonical({
    consumer: pokemon("NONE", "SITRUSBERRY", { hp: 25 }),
    opposing: pokemon("PRESSURE"),
  });
  assert.equal(result.blocked, false);
  assert.equal(result.source, null);
}

{
  const stale = { ability: null, ability_id: "UNNERVE", held_item: null, item: null, hp: 100, max_hp: 100 };
  const result = resolveBerryConsumptionSuppressionCanonical({ consumer: pokemon(), opposing: stale });
  assert.equal(result.blocked, false, "canonical ability=null must suppress stale legacy ability_id");
}

{
  const legacy = { ability_id: "UNNERVE", hp: 100, max_hp: 100 };
  const result = resolveBerryConsumptionSuppressionCanonical({ consumer: pokemon(), opposing: legacy });
  assert.equal(result.blocked, true, "legacy object without ability field may use ability_id fallback");
}

{
  const original = Object.freeze({
    boundary: "action_after",
    item: "SITRUSBERRY",
    triggered: true,
    heal: 25,
    statChanges: Object.freeze([]),
    consumeRequest: Object.freeze({ item: "SITRUSBERRY", itemIsBerry: true }),
  });
  const blocked = applyBerryConsumptionSuppressionCanonical(original, {
    consumer: pokemon("NONE", "SITRUSBERRY", { hp: 25 }),
    opposing: pokemon("UNNERVE"),
  });
  assert.equal(blocked.triggered, false);
  assert.equal(blocked.heal, 0);
  assert.deepEqual(blocked.statChanges, []);
  assert.equal(blocked.consumeRequest, null);
  assert.equal(blocked.blockedByBerrySuppression, true);
}

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_after",
    user: pokemon("UNNERVE"),
    target: pokemon("NONE", "SITRUSBERRY", { hp: 25 }),
    move: { id: "TACKLE", category: "Physical" },
    damageDealt: 25,
  });
  assert.equal(result.targetBerry.triggered, false);
  assert.equal(result.targetBerry.consumeRequest, null);
  assert.equal(result.targetBerry.blockedByBerrySuppression, true);
}

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_after",
    user: pokemon("NONE", "CHERIBERRY", { status: "PARALYSIS" }),
    target: pokemon("UNNERVE"),
    move: { id: "TACKLE", category: "Physical" },
    damageDealt: 10,
  });
  assert.equal(result.userStatusBerry.triggered, false);
  assert.equal(result.userStatusBerry.statusCureRequest, null);
  assert.equal(result.userStatusBerry.consumeRequest, null);
  assert.equal(result.userStatusBerry.blockedByBerrySuppression, true);
}

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_after",
    user: pokemon("PRESSURE"),
    target: pokemon("NONE", "SITRUSBERRY", { hp: 25 }),
    move: { id: "TACKLE", category: "Physical" },
    damageDealt: 25,
  });
  assert.equal(result.targetBerry.triggered, true);
  assert.equal(result.targetBerry.heal, 25);
}

assert.deepEqual(BATTLE_BERRY_CONSUMPTION_SUPPRESSION_COVERAGE_CANONICAL.abilityIds, ["UNNERVE"]);
assert.equal(BATTLE_BERRY_CONSUMPTION_SUPPRESSION_COVERAGE_CANONICAL.classificationCounts.opposingBerryConsumptionBlockAbilities, 1);

console.log("battle berry consumption suppression smoke: PASS");
