import assert from "node:assert/strict";
import { applyBattleAbilityItemActionAfterCanonical } from "../runtime/battle-core-combat-turn.js";

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

for (const [ability, stat] of [
  ["MOXIE", "ATTACK"],
  ["CHILLINGNEIGH", "ATTACK"],
  ["ASONECHILLINGNEIGH", "ATTACK"],
  ["GRIMNEIGH", "SPECIAL_ATTACK"],
  ["ASONEGRIMNEIGH", "SPECIAL_ATTACK"],
]) {
  const resolved = applyBattleAbilityItemActionAfterCanonical(moveAction({
    ability,
    actorStats: { ATTACK: 100, DEFENSE: 90, SPECIAL_ATTACK: 80, SPECIAL_DEFENSE: 70, SPEED: 60 },
  }));
  assert.equal(resolved.action.abilityItemActionAfter.koBoost.triggered, true, ability);
  assert.equal(resolved.statStages[0][stat], 1, ability);
}

{
  const actorStats = { ATTACK: 80, DEFENSE: 90, SPECIAL_ATTACK: 70, SPECIAL_DEFENSE: 60, SPEED: 120 };
  const resolved = applyBattleAbilityItemActionAfterCanonical(moveAction({ ability: "BEASTBOOST", actorStats }));
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

console.log("battle KO boost live stat-stage smoke: PASS");
