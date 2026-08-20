import assert from "node:assert/strict";
import {
  BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL,
  resolveBattleAbilityItemHookCanonical,
} from "../runtime/battle-ability-item-hook-dispatch.js";

function pokemon({ ability = null, heldItem = null, hp = 120, maxHp = 120 } = {}) {
  return {
    ability,
    held_item: heldItem,
    hp,
    max_hp: maxHp,
    status: "NONE",
    types: ["NORMAL"],
    stats: {
      ATTACK: 100,
      DEFENSE: 100,
      SPECIAL_ATTACK: 100,
      SPECIAL_DEFENSE: 100,
      SPEED: 100,
    },
  };
}

const tackle = Object.freeze({ id: "TACKLE", category: "Physical", power: 40, type: "NORMAL" });

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_after",
    user: pokemon(),
    target: pokemon({ ability: "ROUGHSKIN", heldItem: "ROCKYHELMET" }),
    move: tackle,
    damageDealt: 25,
    context: { contact: true, hit: true },
  });
  assert.equal(result.contactReactive.triggered, true);
  assert.equal(result.contactReactive.effects.length, 2);
  assert.deepEqual(result.contactReactive.effects.map((effect) => effect.source), ["ROUGHSKIN", "ROCKYHELMET"]);
  assert.equal(result.contactReactive.effects[0].hpDelta, -15);
  assert.equal(result.contactReactive.effects[1].hpDelta, -20);
  assert.equal(result.contactReactive.userHpDelta, -35);
}

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_after",
    user: pokemon({ ability: "LONGREACH" }),
    target: pokemon({ ability: "IRONBARBS", heldItem: "ROCKYHELMET" }),
    move: tackle,
    damageDealt: 25,
    context: { contact: true, hit: true },
  });
  assert.equal(result.contactReactive.protectedFromContactEffects, true);
  assert.equal(result.contactReactive.triggered, false);
  assert.equal(result.contactReactive.userHpDelta, 0);
}

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_after",
    user: pokemon({ heldItem: "PROTECTIVEPADS" }),
    target: pokemon({ ability: "ROUGHSKIN", heldItem: "ROCKYHELMET" }),
    move: tackle,
    damageDealt: 25,
    context: { contact: true, hit: true },
  });
  assert.equal(result.contactReactive.protectedFromContactEffects, true);
  assert.equal(result.contactReactive.triggered, false);
}

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_after",
    user: pokemon({ ability: "MAGICGUARD" }),
    target: pokemon({ ability: "ROUGHSKIN", heldItem: "ROCKYHELMET" }),
    move: tackle,
    damageDealt: 25,
    context: { contact: true, hit: true },
  });
  assert.equal(result.contactReactive.magicGuard, true);
  assert.equal(result.contactReactive.effects.length, 2);
  assert.equal(result.contactReactive.userHpDelta, 0);
  assert.equal(result.contactReactive.triggered, false);
}

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_after",
    user: pokemon(),
    target: pokemon({ ability: "ROUGHSKIN", heldItem: "ROCKYHELMET" }),
    move: tackle,
    damageDealt: 0,
    context: { contact: true, hit: true },
  });
  assert.equal(result.contactReactive.effects.length, 2, "contact reactions must support a hit that dealt 0 damage");
}

{
  const user = pokemon({ heldItem: null });
  user.item = "PROTECTIVEPADS";
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_after",
    user,
    target: pokemon({ ability: "ROUGHSKIN" }),
    move: tackle,
    damageDealt: 20,
    context: { contact: true, hit: true },
  });
  assert.equal(result.contactReactive.protectedFromContactEffects, false, "canonical held_item=null must suppress stale item alias");
  assert.equal(result.contactReactive.triggered, true);
}

assert.ok(BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL.abilityIds.includes("ROUGHSKIN"));
assert.ok(BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL.abilityIds.includes("IRONBARBS"));
assert.ok(BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL.abilityIds.includes("LONGREACH"));
assert.ok(BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL.itemIds.includes("ROCKYHELMET"));
assert.ok(BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL.itemIds.includes("PROTECTIVEPADS"));
assert.equal(BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL.classificationCounts.contactReactiveExtension.contactReactiveAbilities, 2);
assert.equal(BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL.classificationCounts.contactReactiveExtension.contactSuppressingHeldItems, 1);

console.log("battle contact reactive shared hook smoke: PASS");
