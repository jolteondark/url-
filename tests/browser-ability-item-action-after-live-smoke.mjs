import assert from "node:assert/strict";
import { buildBrowserBattleActionInput } from "../runtime/browser-battle-round-runtime.js";
import { applyBattleAbilityItemActionAfterCanonical } from "../runtime/battle-core-combat-turn.js";
import {
  reflectBattleCoreAbilityItemActionAfterHpToPokemonRuntime,
} from "../runtime/battle-runtime-integration.js";
import { commitBattleSystemsHeldItemRuntime } from "../runtime/battle-held-item-runtime-integration.js";

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

function runtimePokemon({ item = null, hp = 100, maxHp = 100 } = {}) {
  return {
    species: "EEVEE",
    level: 20,
    hp,
    max_hp: maxHp,
    stats: { ATTACK: 50, DEFENSE: 50, SPECIAL_ATTACK: 50, SPECIAL_DEFENSE: 50, SPEED: 50 },
    moves: [{ id: "TACKLE", pp: 35, ppup: 0 }],
    item,
    ability_id: "RUNAWAY",
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

  const reflected = reflectBattleCoreAbilityItemActionAfterHpToPokemonRuntime(
    runtimePokemon({ item: "LIFEORB", hp: 100, maxHp: 100 }),
    { rounds: [{ priorityOrder: [0], actions: [action] }] },
    0,
  );
  assert.equal(reflected.hp, 90, "Life Orb recoil must reach the persistent Pokemon Runtime");
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

  const reflected = reflectBattleCoreAbilityItemActionAfterHpToPokemonRuntime(
    runtimePokemon({ item: "SHELLBELL", hp: 50, maxHp: 100 }),
    { rounds: [{ priorityOrder: [0], actions: [action] }] },
    0,
  );
  assert.equal(reflected.hp, 53, "Shell Bell healing must reach the persistent Pokemon Runtime");
}

{
  const action = resolvedAction(
    pokemon({ hp: 100, maxHp: 100 }),
    pokemon({ heldItem: "SITRUSBERRY", hp: 60, maxHp: 100 }),
  );
  action.abilityItemActionAfter = {
    ...action.abilityItemActionAfter,
    targetBerry: {
      boundary: "action_after",
      item: "SITRUSBERRY",
      triggered: true,
      heal: 25,
      statChanges: [],
      consumeRequest: { item: "SITRUSBERRY", itemIsBerry: true, effectKind: "hp_restore", permanent: true },
    },
  };
  const battleInput = { rounds: [{ priorityOrder: [0], actions: [action] }] };
  const hpReflected = reflectBattleCoreAbilityItemActionAfterHpToPokemonRuntime(
    runtimePokemon({ item: "SITRUSBERRY", hp: 36, maxHp: 100 }),
    battleInput,
    1,
  );
  assert.equal(hpReflected.hp, 61, "HP-threshold Berry healing must reach the persistent Pokemon Runtime");

  const held = commitBattleSystemsHeldItemRuntime({
    battleInput,
    turn: { operations: [{ op: "use_move", round: 1, action: 0 }] },
    pokemon: hpReflected,
    reflectedBattlerIndex: 1,
  });
  assert.equal(held.pokemon.item, null, "consumed Berry must be removed from Pokemon Runtime");
  assert.equal(held.commits.length, 1);
  assert.ok(held.commits[0].operations.some((entry) => entry.op === "clear_initial_item"));
  assert.ok(held.commits[0].operations.some((entry) => entry.op === "runtime_held_item_reflection" && entry.item === null));
}

{
  const action = resolvedAction(
    pokemon({ hp: 100, maxHp: 100 }),
    pokemon({ heldItem: "AIRBALLOON", hp: 100, maxHp: 100 }),
  );
  action.abilityItemActionAfter = {
    ...action.abilityItemActionAfter,
    targetAirBalloon: {
      boundary: "action_after",
      item: "AIRBALLOON",
      triggered: true,
      consumeRequest: { item: "AIRBALLOON", itemIsBerry: false, effectKind: "air_balloon_burst", permanent: true },
    },
  };
  const held = commitBattleSystemsHeldItemRuntime({
    battleInput: { rounds: [{ priorityOrder: [0], actions: [action] }] },
    turn: { operations: [{ op: "use_move", round: 1, action: 0 }] },
    pokemon: runtimePokemon({ item: "AIRBALLOON" }),
    reflectedBattlerIndex: 1,
  });
  assert.equal(held.pokemon.item, null, "Air Balloon burst must use the held-item lifecycle");
  assert.equal(held.commits.length, 1);
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