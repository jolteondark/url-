import assert from "node:assert/strict";
import {
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

{
  const user = pokemon("KLUTZ", "CHOICEBAND");
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_before",
    user,
    target: pokemon(),
    move: { id: "TACKLE", type: "NORMAL", category: "Physical", power: 40 },
    selectedMoveId: "TACKLE",
  });
  assert.equal(result.choiceLock.active, false, "Klutz must suppress Choice lock through the shared hook");
  assert.equal(result.modifiers.damageMultiplierInput.externalAttackMultiplier, 1, "Klutz must suppress Choice Band's stat modifier");
  assert.equal(user.held_item, "CHOICEBAND", "shared hooks must not mutate the persistent held item");
}

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "turn_end",
    user: pokemon("KLUTZ", "LEFTOVERS", { hp: 80, max_hp: 160 }),
  });
  assert.equal(result.triggered, false, "Klutz must suppress Leftovers");
  assert.equal(result.hpDelta, 0);
}

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "survival",
    target: pokemon("KLUTZ", "FOCUSSASH", { hp: 100, max_hp: 100 }),
    incomingDamage: 150,
  });
  assert.equal(result.triggered, false, "Klutz must suppress Focus Sash");
  assert.equal(result.consumeRequest, null);
}

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_after",
    user: pokemon(),
    target: pokemon("KLUTZ", "SITRUSBERRY", { hp: 40, max_hp: 100 }),
    move: { id: "TACKLE", category: "Physical", effect_chance: 0 },
    damageDealt: 30,
  });
  assert.equal(result.targetBerry.triggered, false, "Klutz must suppress automatic Berry activation");
  assert.equal(result.targetBerry.consumeRequest, null);
}

{
  const result = resolveBattleAbilityItemHookCanonical({
    hook: "action_before",
    user: pokemon(),
    target: pokemon("KLUTZ", "AIRBALLOON", { types: ["ELECTRIC"] }),
    move: { id: "EARTHQUAKE", type: "GROUND", category: "Physical", power: 100 },
  });
  assert.equal(result.airBalloon.immune, false, "Klutz must suppress Air Balloon's Ground immunity");
}

{
  const canonicalNull = pokemon(null, "LEFTOVERS", { ability_id: "KLUTZ", hp: 80, max_hp: 160 });
  const result = resolveBattleAbilityItemHookCanonical({ hook: "turn_end", user: canonicalNull });
  assert.equal(result.triggered, true, "pokemon.ability=null must override stale ability_id=KLUTZ");
  assert.equal(result.hpDelta, 10);

  const legacy = { ability_id: "KLUTZ", item: "LEFTOVERS", hp: 80, max_hp: 160, status: "NONE", types: ["NORMAL"] };
  const legacyResult = resolveBattleAbilityItemHookCanonical({ hook: "turn_end", user: legacy });
  assert.equal(legacyResult.triggered, false, "legacy ability_id remains fallback-only when pokemon.ability is absent");
}

assert.ok(BATTLE_ABILITY_ITEM_SHARED_HOOK_CONTRACT_CANONICAL.implementedCoverage.abilityIds.includes("KLUTZ"));
assert.equal(
  BATTLE_ABILITY_ITEM_SHARED_HOOK_CONTRACT_CANONICAL.implementedCoverage.classificationCounts.heldItemEffectSuppressionAbilities,
  1,
);

console.log("battle ability/item Klutz shared-hook smoke: PASS");
