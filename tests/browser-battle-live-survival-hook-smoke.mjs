import assert from "node:assert/strict";
import {
  applyBattleAbilityItemSurvivalCanonical,
} from "../runtime/battle-core-combat-turn.js";
import { resolveHpFaintActionCanonical } from "../runtime/battle-core-hp-faint.js";
import { commitBattleSystemsHeldItemRuntime } from "../runtime/battle-held-item-runtime-integration.js";

function action({
  ability = "NONE",
  heldItem = null,
  hp = 100,
  damage = 150,
  moldBreaker = false,
  survivalRoll = undefined,
} = {}) {
  return {
    kind: "move",
    battlerIndex: 0,
    targetBattlerIndex: 1,
    moveSkipped: false,
    lastMoveFailed: false,
    hpBefore: hp,
    totalHp: 100,
    calculatedDamage: damage,
    abilityItemSurvivalRandomRoll: survivalRoll,
    abilityItemActionBefore: {
      modifiers: {
        targetAbility: ability,
        targetItem: heldItem,
        moldBreaker,
      },
    },
  };
}

function runtimePokemon(item = null) {
  return {
    species: "EEVEE",
    level: 20,
    hp: 1,
    max_hp: 100,
    stats: { ATTACK: 50, DEFENSE: 50, SPECIAL_ATTACK: 50, SPECIAL_DEFENSE: 50, SPEED: 50 },
    moves: [{ id: "TACKLE", pp: 35, ppup: 0 }],
    item,
    ability_id: "RUNAWAY",
    status: "NONE",
  };
}

{
  const survived = applyBattleAbilityItemSurvivalCanonical(action({ ability: "STURDY" }));
  const hp = resolveHpFaintActionCanonical(survived);
  assert.equal(survived.abilityItemSurvival.triggered, true);
  assert.equal(survived.abilityItemSurvival.source, "STURDY");
  assert.equal(survived.calculatedDamage, 99);
  assert.equal(hp.hpAfter, 1);
  assert.equal(hp.fainted, false);
  assert.equal(survived.abilityItemSurvival.consumeRequest, null);
}

{
  const bypassed = applyBattleAbilityItemSurvivalCanonical(action({ ability: "STURDY", moldBreaker: true }));
  const hp = resolveHpFaintActionCanonical(bypassed);
  assert.equal(bypassed.abilityItemSurvival.triggered, false);
  assert.equal(bypassed.calculatedDamage, 150);
  assert.equal(hp.hpAfter, 0);
  assert.equal(hp.fainted, true);
}

{
  const survived = applyBattleAbilityItemSurvivalCanonical(action({ heldItem: "FOCUSSASH", moldBreaker: true }));
  const hp = resolveHpFaintActionCanonical(survived);
  assert.equal(survived.abilityItemSurvival.triggered, true);
  assert.equal(survived.abilityItemSurvival.source, "FOCUSSASH");
  assert.equal(survived.calculatedDamage, 99);
  assert.equal(hp.hpAfter, 1);
  assert.equal(hp.fainted, false);
  assert.deepEqual(survived.abilityItemSurvival.consumeRequest, {
    kind: "consume_held_item",
    item: "FOCUSSASH",
    reason: "focus_sash_survival",
    permanent: true,
  });

  const held = commitBattleSystemsHeldItemRuntime({
    battleInput: { rounds: [{ priorityOrder: [0], actions: [survived] }] },
    turn: { operations: [{ op: "use_move", round: 1, action: 0 }] },
    pokemon: runtimePokemon("FOCUSSASH"),
    reflectedBattlerIndex: 1,
  });
  assert.equal(held.pokemon.item, null, "Focus Sash must be removed from persistent Pokemon Runtime");
  assert.equal(held.commits.length, 1);
  assert.equal(held.commits[0].source, "shared_survival");
  assert.ok(held.commits[0].operations.some((entry) => entry.op === "clear_initial_item"));
  assert.ok(held.commits[0].operations.some((entry) => entry.op === "runtime_held_item_reflection" && entry.item === null));
}

{
  const notFull = applyBattleAbilityItemSurvivalCanonical(action({ heldItem: "FOCUSSASH", hp: 99 }));
  assert.equal(notFull.abilityItemSurvival.triggered, false);
  assert.equal(notFull.calculatedDamage, 150);
}

{
  const survived = applyBattleAbilityItemSurvivalCanonical(action({
    heldItem: "FOCUSBAND",
    hp: 37,
    damage: 80,
    moldBreaker: true,
    survivalRoll: 9,
  }));
  const hp = resolveHpFaintActionCanonical(survived);
  assert.equal(survived.abilityItemSurvival.triggered, true, "Focus Band should trigger on a roll below 10");
  assert.equal(survived.abilityItemSurvival.source, "FOCUSBAND");
  assert.equal(survived.calculatedDamage, 36, "Focus Band should leave exactly 1 HP even below full HP");
  assert.equal(hp.hpAfter, 1);
  assert.equal(hp.fainted, false);
  assert.equal(survived.abilityItemSurvival.consumeRequest, null, "Focus Band is not consumed");
}

{
  const failedRoll = applyBattleAbilityItemSurvivalCanonical(action({
    heldItem: "FOCUSBAND",
    hp: 37,
    damage: 80,
    survivalRoll: 10,
  }));
  const hp = resolveHpFaintActionCanonical(failedRoll);
  assert.equal(failedRoll.abilityItemSurvival.triggered, false, "Focus Band roll 10 must fail the 10% check");
  assert.equal(failedRoll.calculatedDamage, 80);
  assert.equal(hp.fainted, true);
}

{
  const nonLethal = applyBattleAbilityItemSurvivalCanonical(action({
    heldItem: "FOCUSBAND",
    hp: 37,
    damage: 20,
    survivalRoll: 0,
  }));
  assert.equal(nonLethal.abilityItemSurvival.triggered, false, "Focus Band must only check lethal move damage");
}

{
  const consumed = applyBattleAbilityItemSurvivalCanonical(action({ heldItem: null }));
  assert.equal(consumed.abilityItemSurvival.triggered, false, "canonical held_item=null must not revive stale aliases");
}

console.log("browser Battle live survival hook smoke: PASS");
