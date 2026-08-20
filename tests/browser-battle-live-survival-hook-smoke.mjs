import assert from "node:assert/strict";
import {
  applyBattleAbilityItemSurvivalCanonical,
} from "../runtime/battle-core-combat-turn.js";
import { resolveHpFaintActionCanonical } from "../runtime/battle-core-hp-faint.js";
import { commitBattleSystemsHeldItemRuntime } from "../runtime/battle-held-item-runtime-integration.js";

function action({ ability = "NONE", heldItem = null, hp = 100, damage = 150, moldBreaker = false } = {}) {
  return {
    kind: "move",
    battlerIndex: 0,
    targetBattlerIndex: 1,
    moveSkipped: false,
    lastMoveFailed: false,
    hpBefore: hp,
    totalHp: 100,
    calculatedDamage: damage,
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
  const consumed = applyBattleAbilityItemSurvivalCanonical(action({ heldItem: null }));
  assert.equal(consumed.abilityItemSurvival.triggered, false, "canonical held_item=null must not revive stale aliases");
}

console.log("browser Battle live survival hook smoke: PASS");
