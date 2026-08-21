import assert from "node:assert/strict";
import {
  BATTLE_KO_BOOST_ABILITY_COVERAGE_CANONICAL,
  resolveKoBoostAbilityActionAfterCanonical,
} from "../runtime/battle-core-ko-boost-ability-extension.js";
import {
  BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL,
  resolveBattleAbilityItemHookCanonical,
} from "../runtime/battle-ability-item-hook-dispatch.js";

const pokemon = (ability, stats = {}) => ({
  ability,
  held_item: null,
  hp: 100,
  max_hp: 100,
  stats: {
    ATTACK: 100,
    DEFENSE: 90,
    SPECIAL_ATTACK: 80,
    SPECIAL_DEFENSE: 70,
    SPEED: 60,
    ...stats,
  },
});

assert.deepEqual(resolveKoBoostAbilityActionAfterCanonical({
  user: pokemon("MOXIE"),
  context: { targetFainted: true },
}).statChanges, [{ subject: "user", stat: "ATTACK", delta: 1 }]);

assert.deepEqual(resolveKoBoostAbilityActionAfterCanonical({
  user: pokemon("CHILLINGNEIGH"),
  context: { targetFainted: true },
}).statChanges, [{ subject: "user", stat: "ATTACK", delta: 1 }]);

assert.deepEqual(resolveKoBoostAbilityActionAfterCanonical({
  user: pokemon("GRIMNEIGH"),
  context: { targetFainted: true },
}).statChanges, [{ subject: "user", stat: "SPECIAL_ATTACK", delta: 1 }]);

assert.deepEqual(resolveKoBoostAbilityActionAfterCanonical({
  user: pokemon("BEASTBOOST", { SPEED: 140 }),
  context: { targetFainted: true },
}).statChanges, [{ subject: "user", stat: "SPEED", delta: 1 }]);

assert.deepEqual(resolveKoBoostAbilityActionAfterCanonical({
  user: pokemon("BEASTBOOST", { ATTACK: 120, DEFENSE: 120, SPECIAL_ATTACK: 120, SPECIAL_DEFENSE: 120, SPEED: 120 }),
  context: { targetFainted: true },
}).statChanges, [{ subject: "user", stat: "ATTACK", delta: 1 }]);

assert.deepEqual(resolveKoBoostAbilityActionAfterCanonical({
  user: pokemon("MOXIE"),
  context: { targetFainted: false },
}).statChanges, []);

assert.deepEqual(resolveKoBoostAbilityActionAfterCanonical({
  user: { ability: null, ability_id: "MOXIE", held_item: null },
  context: { targetFainted: true },
}).statChanges, []);

assert.deepEqual(resolveKoBoostAbilityActionAfterCanonical({
  user: { ability_id: "MOXIE", stats: { ATTACK: 1 } },
  context: { targetFainted: true },
}).statChanges, [{ subject: "user", stat: "ATTACK", delta: 1 }]);

const shared = resolveBattleAbilityItemHookCanonical({
  hook: "action_after",
  user: pokemon("ASONECHILLINGNEIGH"),
  target: pokemon(null),
  move: { id: "TACKLE", type: "NORMAL", category: "Physical", power: 40 },
  damageDealt: 30,
  context: { targetFainted: true },
});
assert.deepEqual(shared.koBoost.statChanges, [{ subject: "user", stat: "ATTACK", delta: 1 }]);

assert.equal(BATTLE_KO_BOOST_ABILITY_COVERAGE_CANONICAL.abilityCount, 6);
for (const ability of ["MOXIE", "CHILLINGNEIGH", "GRIMNEIGH", "BEASTBOOST", "ASONECHILLINGNEIGH", "ASONEGRIMNEIGH"]) {
  assert.ok(BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL.abilityIds.includes(ability));
}

console.log("battle KO boost ability shared hook smoke: PASS");
