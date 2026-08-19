import assert from "node:assert/strict";
import {
  BATTLE_ABILITY_ITEM_HOOK_POINTS_CANONICAL,
  BATTLE_ABILITY_ITEM_SHARED_HOOK_CONTRACT_CANONICAL,
  resolveBattleAbilityItemHookCanonical,
} from "../runtime/battle-ability-item-hook-dispatch.js";

const pokemon = (ability = "NONE", heldItem = null, extra = {}) => ({
  ability,
  held_item: heldItem,
  item: heldItem,
  status: "NONE",
  hp: 100,
  max_hp: 100,
  types: ["NORMAL"],
  stats: { ATTACK: 100, DEFENSE: 100, SPECIAL_ATTACK: 100, SPECIAL_DEFENSE: 100, SPEED: 100 },
  ...extra,
});

assert.deepEqual(BATTLE_ABILITY_ITEM_HOOK_POINTS_CANONICAL, [
  "switch_in", "action_before", "action_after", "turn_end", "survival",
]);
assert.ok(BATTLE_ABILITY_ITEM_SHARED_HOOK_CONTRACT_CANONICAL.implementedCoverage.abilityCount >= 60);
assert.ok(BATTLE_ABILITY_ITEM_SHARED_HOOK_CONTRACT_CANONICAL.implementedCoverage.itemCount >= 30);
assert.match(BATTLE_ABILITY_ITEM_SHARED_HOOK_CONTRACT_CANONICAL.pokemonRuntimeSource.ability, /^pokemon\.ability/);
assert.match(BATTLE_ABILITY_ITEM_SHARED_HOOK_CONTRACT_CANONICAL.pokemonRuntimeSource.heldItem, /^pokemon\.held_item/);

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "switch_in",
    user: pokemon("INTIMIDATE"),
    target: pokemon("NONE"),
  });
  assert.equal(result.boundary, "switch_in");
  assert.equal(result.entry.changes[0].stat, "ATTACK");
  assert.equal(result.entry.changes[0].delta, -1);
}

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_before",
    user: pokemon("TECHNICIAN", "CHOICEBAND"),
    target: pokemon("NONE"),
    move: { id: "TACKLE", type: "NORMAL", category: "Physical", power: 40 },
    selectedMoveId: "TACKLE",
  });
  assert.equal(result.boundary, "action_before");
  assert.equal(result.choiceLock.active, true);
  assert.equal(result.choiceLock.lockedMoveId, "TACKLE");
  assert.equal(result.modifiers.damageMultiplierInput.externalPowerMultiplier, 1.5);
  assert.equal(result.modifiers.damageMultiplierInput.externalAttackMultiplier, 1.5);
}

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_after",
    user: pokemon("NONE", "LIFEORB"),
    target: pokemon("NONE", "SITRUSBERRY", { hp: 40, max_hp: 100 }),
    move: { id: "TACKLE", category: "Physical", effect_chance: 0 },
    damageDealt: 30,
  });
  assert.equal(result.boundary, "action_after");
  assert.equal(result.userHpDelta, -10);
  assert.equal(result.targetBerry.triggered, true);
  assert.equal(result.targetBerry.consumeRequest.item, "SITRUSBERRY");
}

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "turn_end",
    user: pokemon("NONE", "LEFTOVERS", { hp: 80, max_hp: 160 }),
  });
  assert.equal(result.boundary, "turn_end");
  assert.equal(result.hpDelta, 10);
}

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "survival",
    target: pokemon("NONE", "FOCUSSASH", { hp: 100, max_hp: 100 }),
    incomingDamage: 150,
  });
  assert.equal(result.boundary, "survival");
  assert.equal(result.triggered, true);
  assert.equal(result.damage, 99);
  assert.equal(result.consumeRequest.item, "FOCUSSASH");
  assert.equal(result.consumeRequest.permanent, true);
}

{
  const consumed = pokemon("NONE", null, { item: "LEFTOVERS", hp: 80, max_hp: 160 });
  const turnEnd = resolveBattleAbilityItemHookCanonical({ hook: "turn_end", user: consumed });
  assert.equal(turnEnd.triggered, false, "held_item=null must suppress a stale compatibility item alias after consumption");
  assert.equal(turnEnd.hpDelta, 0);

  const staleChoice = pokemon("NONE", null, { item: "CHOICEBAND" });
  const actionBefore = resolveBattleAbilityItemHookCanonical({
    hook: "action_before",
    user: staleChoice,
    target: pokemon(),
    move: { id: "TACKLE", type: "NORMAL", category: "Physical", power: 40 },
    selectedMoveId: "TACKLE",
  });
  assert.equal(actionBefore.choiceLock.active, false, "consumed held item must not resurrect a Choice lock");
  assert.equal(actionBefore.modifiers.damageMultiplierInput.externalAttackMultiplier, 1);

  const staleSash = pokemon("NONE", null, { item: "FOCUSSASH", hp: 100, max_hp: 100 });
  const survival = resolveBattleAbilityItemHookCanonical({ hook: "survival", target: staleSash, incomingDamage: 150 });
  assert.equal(survival.triggered, false, "consumed Focus Sash must not resurrect from pokemon.item");

  const staleBerry = pokemon("NONE", null, { item: "SITRUSBERRY", hp: 40, max_hp: 100 });
  const actionAfter = resolveBattleAbilityItemHookCanonical({
    hook: "action_after",
    user: pokemon(),
    target: staleBerry,
    move: { id: "TACKLE", category: "Physical", effect_chance: 0 },
    damageDealt: 30,
  });
  assert.equal(actionAfter.targetBerry.triggered, false, "consumed berry must not resurrect from pokemon.item");
}

{
  const staleAbility = pokemon(null, null, { ability_id: "STURDY", hp: 100, max_hp: 100 });
  const survival = resolveBattleAbilityItemHookCanonical({ hook: "survival", target: staleAbility, incomingDamage: 150 });
  assert.equal(survival.triggered, false, "pokemon.ability must override a stale ability_id compatibility alias");

  const legacyTarget = { ability_id: "STURDY", item: "FOCUSSASH", hp: 100, max_hp: 100 };
  const legacy = resolveBattleAbilityItemHookCanonical({ hook: "survival", target: legacyTarget, incomingDamage: 150 });
  assert.equal(legacy.triggered, true, "legacy aliases remain fallback-only when persistent fields are absent");
}

assert.throws(() => resolveBattleAbilityItemHookCanonical({ hook: "unknown" }), RangeError);
console.log("battle ability/item hook dispatch smoke: PASS");
