import assert from "node:assert/strict";
import { buildBrowserBattleActionInput } from "../runtime/browser-battle-round-runtime.js";
import { applyBattleAbilityItemActionAfterCanonical } from "../runtime/battle-core-combat-turn.js";
import { reflectBattleCoreAbilityItemActionAfterHpToPokemonRuntime } from "../runtime/battle-runtime-integration.js";

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
  contact: true,
};

{
  const actor = pokemon({ heldItem: "LIFEORB", hp: 100, maxHp: 100 });
  const target = pokemon({ ability: "ROUGHSKIN", hp: 100, maxHp: 100 });
  const built = buildBrowserBattleActionInput({
    actor,
    target,
    move: tackle,
    moveIndex: 0,
    battlerIndex: 0,
    targetBattlerIndex: 1,
    reflectPp: false,
  });
  assert.equal(built.abilityItemActionAfterInput.user.held_item, "LIFEORB");
  assert.equal(built.abilityItemActionAfterInput.target.ability, "ROUGHSKIN");
  assert.equal(built.abilityItemActionAfterInput.move.contact, true);

  const resolved = applyBattleAbilityItemActionAfterCanonical({
    ...built,
    hpReductionResolution: { amount: 24 },
    hpAfter: 76,
    moveSkipped: false,
    lastMoveFailed: false,
  });
  assert.equal(resolved.action.abilityItemActionAfter.userHpDelta, -10);
  assert.equal(resolved.action.abilityItemActionAfter.contactReactive.triggered, true);
  assert.equal(resolved.action.abilityItemActionAfter.contactReactive.userHpDelta, -12);

  const battleInput = { rounds: [{ priorityOrder: [0], actions: [resolved.action] }] };
  const reflected = reflectBattleCoreAbilityItemActionAfterHpToPokemonRuntime(actor, battleInput, 0);
  assert.equal(reflected.hp, 78, "Life Orb and Rough Skin must reflect through Pokemon Runtime exactly once");
}

{
  const actor = pokemon({ heldItem: "SHELLBELL", hp: 50, maxHp: 100 });
  const target = pokemon({ hp: 100, maxHp: 100 });
  const built = buildBrowserBattleActionInput({
    actor,
    target,
    move: tackle,
    moveIndex: 0,
    battlerIndex: 0,
    targetBattlerIndex: 1,
    reflectPp: false,
  });
  const resolved = applyBattleAbilityItemActionAfterCanonical({
    ...built,
    hpReductionResolution: { amount: 24 },
    hpAfter: 76,
    moveSkipped: false,
    lastMoveFailed: false,
  });
  assert.equal(resolved.action.abilityItemActionAfter.userShellBell.triggered, true);
  assert.equal(resolved.action.abilityItemActionAfter.userShellBell.hpDelta, 3);
  const battleInput = { rounds: [{ priorityOrder: [0], actions: [resolved.action] }] };
  const reflected = reflectBattleCoreAbilityItemActionAfterHpToPokemonRuntime(actor, battleInput, 0);
  assert.equal(reflected.hp, 53, "Shell Bell must use the shared action-after owner once, not the legacy duplicate delta");
}

console.log("browser ability/item action-after live smoke: PASS");
