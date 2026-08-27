import assert from "node:assert/strict";

import {
  BATTLE_TYPE_GEM_COVERAGE_CANONICAL,
  HELD_TYPE_GEM_ITEM_IDS_CANONICAL,
  TYPE_GEM_TYPE_BY_ITEM_CANONICAL,
  resolveTypeGemActionAfterCanonical,
  resolveTypeGemActionBeforeCanonical,
} from "../runtime/item-held-type-gem-effects.js";
import {
  BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL,
  resolveBattleAbilityItemHookCanonical,
} from "../runtime/battle-ability-item-hook-dispatch.js";
import { commitBattleSystemsHeldItemRuntime } from "../runtime/battle-held-item-runtime-integration.js";

const expected = [
  "BUGGEM", "DARKGEM", "DRAGONGEM", "ELECTRICGEM", "FAIRYGEM", "FIGHTINGGEM",
  "FIREGEM", "FLYINGGEM", "GHOSTGEM", "GRASSGEM", "GROUNDGEM", "ICEGEM",
  "NORMALGEM", "POISONGEM", "PSYCHICGEM", "ROCKGEM", "STEELGEM", "WATERGEM",
].sort();

assert.deepEqual(HELD_TYPE_GEM_ITEM_IDS_CANONICAL, expected);
assert.equal(BATTLE_TYPE_GEM_COVERAGE_CANONICAL.itemCount, 18);
assert.equal(TYPE_GEM_TYPE_BY_ITEM_CANONICAL.FIREGEM, "FIRE");

const fire = resolveTypeGemActionBeforeCanonical({
  user: { held_item: "FIREGEM", ability: "BLAZE" },
  move: { id: "FLAMETHROWER", type: "FIRE", category: "Special", power: 90 },
});
assert.equal(fire.triggered, true);
assert.equal(fire.powerMultiplier, 1.3);

assert.equal(resolveTypeGemActionBeforeCanonical({
  user: { held_item: "FIREGEM" },
  move: { id: "SURF", type: "WATER", category: "Special", power: 90 },
}).powerMultiplier, 1);

assert.equal(resolveTypeGemActionBeforeCanonical({
  user: { held_item: "FIREGEM" },
  move: { id: "FIREPLEDGE", type: "FIRE", category: "Special", power: 80 },
}).triggered, false);

assert.equal(resolveTypeGemActionBeforeCanonical({
  user: { held_item: "FIREGEM", ability: "KLUTZ" },
  move: { id: "FLAMETHROWER", type: "FIRE", category: "Special", power: 90 },
}).triggered, false);

const after = resolveTypeGemActionAfterCanonical({
  user: { held_item: "FIREGEM" },
  move: { id: "FLAMETHROWER", type: "FIRE", category: "Special" },
  damageDealt: 37,
});
assert.equal(after.triggered, true);
assert.deepEqual(after.consumeRequest, {
  item: "FIREGEM",
  itemIsBerry: false,
  effectKind: "type_gem",
  permanent: true,
});
assert.equal(resolveTypeGemActionAfterCanonical({
  user: { held_item: "FIREGEM" },
  move: { id: "FLAMETHROWER", type: "FIRE", category: "Special" },
  damageDealt: 0,
}).triggered, false);

const dispatched = resolveBattleAbilityItemHookCanonical({
  hook: "action_before",
  user: { held_item: "FIREGEM", ability: "BLAZE" },
  target: { held_item: null, ability: "NONE" },
  move: { id: "FLAMETHROWER", type: "FIRE", category: "Special", power: 90 },
  context: { typeMod: 1 },
});
assert.equal(dispatched.userTypeGem.triggered, true);
assert.equal(dispatched.modifiers.damageMultiplierInput.externalPowerMultiplier, 1.3);
assert.ok(BATTLE_ABILITY_ITEM_SHARED_IMPLEMENTED_COVERAGE_CANONICAL.itemIds.includes("FIREGEM"));

const pokemon = {
  species: "CHARMANDER",
  level: 10,
  exp: 0,
  hp: 30,
  max_hp: 30,
  stats: { HP: 30, ATTACK: 15, DEFENSE: 14, SPECIAL_ATTACK: 18, SPECIAL_DEFENSE: 15, SPEED: 17 },
  moves: [],
  ability: "BLAZE",
  nature: "HARDY",
  gender: 0,
  status: "NONE",
  status_count: 0,
  item: "FIREGEM",
  held_item: "FIREGEM",
};
const battleInput = {
  rounds: [{
    priorityOrder: [0],
    actions: [{
      battlerIndex: 0,
      targetBattlerIndex: 1,
      abilityItemActionAfter: {
        userTypeGem: {
          triggered: true,
          consumeRequest: {
            item: "FIREGEM",
            itemIsBerry: false,
            effectKind: "type_gem",
            permanent: true,
          },
        },
      },
    }],
  }],
};
const turn = { operations: [{ op: "use_move", round: 1, action: 0 }] };
const committed = commitBattleSystemsHeldItemRuntime({
  battleInput,
  turn,
  pokemon,
  reflectedBattlerIndex: 0,
});
assert.equal(committed.pokemon.item, null);
assert.ok(committed.commits.some((entry) => entry.source === "type_gem_action_after"));

console.log("battle type gem item smoke: ok");
