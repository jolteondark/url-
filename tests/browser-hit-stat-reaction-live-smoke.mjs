import assert from "node:assert/strict";
import { applyBattleAbilityItemActionAfterCanonical } from "../runtime/battle-core-combat-turn.js";

function resolvedMove({ targetAbility, category = "Physical", type = "NORMAL", damage = 12 } = {}) {
  return {
    kind: "move",
    battlerIndex: 0,
    targetBattlerIndex: 1,
    moveId: type === "DARK" ? "BITE" : "TACKLE",
    moveCategory: category,
    functionCode: "None",
    abilityItemActionBefore: {
      modifiers: {
        userAbility: "NONE",
        userItem: null,
        targetAbility,
        targetItem: null,
      },
    },
    actorHpBefore: 100,
    actorTotalHp: 100,
    actorStats: {
      ATTACK: 50,
      DEFENSE: 50,
      SPECIAL_ATTACK: 50,
      SPECIAL_DEFENSE: 50,
      SPEED: 50,
    },
    hpBefore: 100,
    hpAfter: 100 - damage,
    totalHp: 100,
    targetStats: {
      ATTACK: 50,
      DEFENSE: 50,
      SPECIAL_ATTACK: 50,
      SPECIAL_DEFENSE: 50,
      SPEED: 50,
    },
    damageInput: {
      damageMultiplierInput: {
        type,
      },
    },
    hpReductionResolution: { amount: damage },
    typeEffectivenessResolution: { multiplier: 1 },
    fainted: false,
    moveSkipped: false,
    lastMoveFailed: false,
  };
}

{
  const result = applyBattleAbilityItemActionAfterCanonical(resolvedMove({ targetAbility: "STAMINA" }));
  assert.deepEqual(result.action.abilityItemActionAfter.contactReactive.hitStatReaction.statChanges, [
    { subject: "target", stat: "DEFENSE", delta: 1 },
  ]);
  assert.equal(result.statStages[1].DEFENSE, 1, "Stamina must commit through the shared live stat-stage owner");
}

{
  const result = applyBattleAbilityItemActionAfterCanonical(resolvedMove({ targetAbility: "WEAKARMOR" }));
  assert.equal(result.statStages[1].DEFENSE, -1);
  assert.equal(result.statStages[1].SPEED, 2);
}

{
  const result = applyBattleAbilityItemActionAfterCanonical(resolvedMove({ targetAbility: "JUSTIFIED", type: "DARK" }));
  assert.equal(result.statStages[1].ATTACK, 1);
}

{
  const result = applyBattleAbilityItemActionAfterCanonical(resolvedMove({ targetAbility: "STAMINA", damage: 0 }));
  assert.equal(result.action.abilityItemActionAfter.contactReactive.hitStatReaction.triggered, false);
  assert.equal(result.statStages[1].DEFENSE, 0, "no hit must not mutate live stat stages");
}

console.log("browser hit stat reaction live smoke: PASS");
