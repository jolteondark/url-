import assert from "node:assert/strict";
import { applyBattleAbilityItemActionAfterCanonical } from "../runtime/battle-core-combat-turn.js";
import { buildBrowserBattleActionInput } from "../runtime/browser-battle-round-runtime.js";

function pokemon({ ability = "NONE", stats, hp = 100, maxHp = 100 } = {}) {
  return {
    species: "EEVEE",
    level: 50,
    hp,
    max_hp: maxHp,
    stats,
    status: "NONE",
    ability,
    held_item: null,
    types: ["NORMAL"],
    moves: [{ id: "TACKLE", pp: 35, ppup: 0 }],
  };
}

function moveAction({ ability, targetFainted = true, actorStats = {} }) {
  return {
    kind: "move",
    moveSkipped: false,
    lastMoveFailed: false,
    battlerIndex: 0,
    targetBattlerIndex: 1,
    abilityItemActionBefore: {
      modifiers: {
        userAbility: ability,
        userItem: null,
        targetAbility: "NONE",
        targetItem: null,
      },
    },
    actorHpBefore: 100,
    actorTotalHp: 100,
    actorStats,
    hpFunctionInput: { actorStatus: "NONE" },
    hpBefore: 25,
    hpAfter: targetFainted ? 0 : 5,
    totalHp: 25,
    fainted: targetFainted,
    hpReductionResolution: { amount: targetFainted ? 25 : 20 },
    moveId: "TACKLE",
    moveCategory: "Physical",
    functionCode: "None",
    secondaryEffectInputs: [],
  };
}

{
  const resolved = applyBattleAbilityItemActionAfterCanonical(moveAction({
    ability: "MOXIE",
    actorStats: { ATTACK: 100, DEFENSE: 90, SPECIAL_ATTACK: 80, SPECIAL_DEFENSE: 70, SPEED: 60 },
  }));
  assert.equal(resolved.action.abilityItemActionAfter.koBoost.triggered, true);
  assert.equal(resolved.statStages[0].ATTACK, 1);
}

{
  const actorStats = { ATTACK: 80, DEFENSE: 90, SPECIAL_ATTACK: 70, SPECIAL_DEFENSE: 60, SPEED: 120 };
  const action = moveAction({ ability: "BEASTBOOST", actorStats });
  const resolved = applyBattleAbilityItemActionAfterCanonical(action);
  assert.equal(resolved.action.abilityItemActionAfter.koBoost.triggered, true);
  assert.equal(resolved.action.abilityItemActionAfter.koBoost.stat, "SPEED");
  assert.equal(resolved.statStages[0].SPEED, 1);
  assert.equal(actorStats.SPEED, 120);
}

{
  const resolved = applyBattleAbilityItemActionAfterCanonical(moveAction({
    ability: "MOXIE",
    targetFainted: false,
    actorStats: { ATTACK: 100 },
  }));
  assert.equal(resolved.action.abilityItemActionAfter.koBoost.triggered, false);
  assert.equal(resolved.statStages[0].ATTACK, 0);
}

{
  const actorStats = { ATTACK: 81, DEFENSE: 82, SPECIAL_ATTACK: 83, SPECIAL_DEFENSE: 84, SPEED: 125 };
  const targetStats = { ATTACK: 70, DEFENSE: 71, SPECIAL_ATTACK: 72, SPECIAL_DEFENSE: 73, SPEED: 74 };
  const action = buildBrowserBattleActionInput({
    actor: pokemon({ ability: "BEASTBOOST", stats: actorStats }),
    target: pokemon({ stats: targetStats, hp: 25, maxHp: 25 }),
    move: {
      id: "TACKLE",
      type: "NORMAL",
      category: "Physical",
      power: 40,
      accuracy: 100,
      total_pp: 35,
      priority: 0,
      function_code: "None",
      effect_chance: 0,
    },
    moveIndex: 0,
    battlerIndex: 0,
    targetBattlerIndex: 1,
    reflectPp: false,
  });
  assert.deepEqual(action.actorStats, actorStats);
  assert.deepEqual(action.targetStats, targetStats);
  assert.notEqual(action.actorStats, actorStats);
}

console.log("battle KO boost live stat-stage smoke: PASS");
