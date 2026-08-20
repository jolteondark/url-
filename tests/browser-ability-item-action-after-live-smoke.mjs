import assert from "node:assert/strict";
import { buildBrowserBattleActionInput } from "../runtime/browser-battle-round-runtime.js";
import { applyBattleAbilityItemActionAfterCanonical } from "../runtime/battle-core-combat-turn.js";

function pokemon({ ability = "NONE", heldItem = null, hp = 100, maxHp = 100 } = {}) {
  return {
    species: "EEVEE",
    level: 20,
    hp,
    max_hp: maxHp,
    stats: { ATTACK: 50, DEFENSE: 50, SPECIAL_ATTACK: 50, SPECIAL_DEFENSE: 50, SPEED: 50 },
    moves: [{ id: "TACKLE", pp: 35, ppup: 0 }],
    types: ["NORMAL"],
    ability,
    held_item: heldItem,
    item: heldItem,
    status: "NONE",
  };
}

const tackle = {
  id: "TACKLE",
  type: "NORMAL",
  category: "Physical",
  power: 40,
  accuracy: 100,
  priority: 0,
  function_code: "None",
  effect_chance: 0,
  total_pp: 35,
};

function resolvedAction(actor, target) {
  const built = buildBrowserBattleActionInput({
    actor,
    target,
    move: tackle,
    moveIndex: 0,
    battlerIndex: 0,
    targetBattlerIndex: 1,
    reflectPp: false,
  });
  return applyBattleAbilityItemActionAfterCanonical({
    ...built,
    hpReductionResolution: { amount: 24 },
    hpAfter: 76,
    moveSkipped: false,
    lastMoveFailed: false,
  }).action;
}

{
  const action = resolvedAction(
    pokemon({ heldItem: "LIFEORB", hp: 100, maxHp: 100 }),
    pokemon({ hp: 100, maxHp: 100 }),
  );
  assert.equal(action.abilityItemActionAfter.boundary, "action_after");
  assert.equal(action.abilityItemActionAfter.userItem, "LIFEORB");
  assert.equal(action.abilityItemActionAfter.userHpDelta, -10);
  assert.equal(action.abilityItemActionAfter.reason, "life_orb");
}

{
  const action = resolvedAction(
    pokemon({ heldItem: "SHELLBELL", hp: 50, maxHp: 100 }),
    pokemon({ hp: 100, maxHp: 100 }),
  );
  assert.equal(action.abilityItemActionAfter.userItem, "SHELLBELL");
  assert.equal(action.abilityItemActionAfter.userShellBell.triggered, true);
  assert.equal(action.abilityItemActionAfter.userShellBell.hpDelta, 3);
  assert.equal(action.abilityItemActionAfter.userHpDelta, 3);
}

{
  const built = buildBrowserBattleActionInput({
    actor: pokemon({ heldItem: "LIFEORB" }),
    target: pokemon(),
    move: tackle,
    moveIndex: 0,
    battlerIndex: 0,
    targetBattlerIndex: 1,
    reflectPp: false,
  });
  const skipped = applyBattleAbilityItemActionAfterCanonical({ ...built, moveSkipped: true }).action;
  assert.equal(skipped.abilityItemActionAfter, undefined, "skipped moves must not emit action-after hooks");
}

console.log("browser ability/item action-after live smoke: PASS");
