import assert from "node:assert/strict";
import { applyBattleAbilityItemActionAfterCanonical } from "../runtime/battle-core-combat-turn.js";

function action({ item = "LIECHIBERRY", ability = "NONE", hpAfter = 25 } = {}) {
  return {
    kind: "move",
    battlerIndex: 0,
    targetBattlerIndex: 1,
    moveId: "TACKLE",
    moveCategory: "Physical",
    functionCode: "None",
    hpBefore: 100,
    hpAfter,
    totalHp: 100,
    actorHpBefore: 100,
    actorTotalHp: 100,
    hpReductionResolution: { amount: Math.max(0, 100 - hpAfter) },
    damageInput: { damageMultiplierInput: { type: "NORMAL" } },
    abilityItemActionBefore: {
      modifiers: {
        userAbility: "NONE",
        targetAbility: ability,
        userItem: null,
        targetItem: item,
        moldBreaker: false,
      },
    },
  };
}

{
  const resolved = applyBattleAbilityItemActionAfterCanonical(action(), { 0: {}, 1: { ATTACK: 0 } });
  assert.equal(resolved.statStages[0].ATTACK, 0, "target Berry must not raise the attacker's stage");
  assert.equal(resolved.statStages[1].ATTACK, 1, "Liechi Berry must raise the holder's Attack stage");
  assert.equal(resolved.action.abilityItemActionAfter.targetBerry.triggered, true);
  assert.equal(resolved.action.abilityItemActionAfter.targetBerry.consumeRequest?.item, "LIECHIBERRY");
}

{
  const resolved = applyBattleAbilityItemActionAfterCanonical(action(), { 0: {}, 1: { ATTACK: 6 } });
  assert.equal(resolved.statStages[1].ATTACK, 6, "pinch Berry must respect the canonical +6 cap");
  assert.equal(resolved.action.abilityItemActionAfter.targetBerry.triggered, false, "capped stat Berry must not trigger");
  assert.equal(resolved.action.abilityItemActionAfter.targetBerry.consumeRequest, null, "capped stat Berry must not be consumed");
}

{
  const resolved = applyBattleAbilityItemActionAfterCanonical(action({ ability: "RIPEN" }), { 0: {}, 1: { ATTACK: 0 } });
  assert.equal(resolved.statStages[1].ATTACK, 2, "Ripen must double the canonical pinch-stat Berry stage delta");
  assert.equal(resolved.action.abilityItemActionAfter.targetBerry.consumeRequest?.item, "LIECHIBERRY");
}

{
  const resolved = applyBattleAbilityItemActionAfterCanonical(action({ ability: "GLUTTONY", hpAfter: 50 }), { 0: {}, 1: { ATTACK: 0 } });
  assert.equal(resolved.statStages[1].ATTACK, 1, "Gluttony must allow the pinch-stat Berry at half HP");
  assert.equal(resolved.action.abilityItemActionAfter.targetBerry.consumeRequest?.item, "LIECHIBERRY");
}

{
  const resolved = applyBattleAbilityItemActionAfterCanonical(action({ item: null }), { 0: { ATTACK: 2 }, 1: { ATTACK: 3 } });
  assert.equal(resolved.statStages[0].ATTACK, 2);
  assert.equal(resolved.statStages[1].ATTACK, 3);
  assert.equal(resolved.action.abilityItemActionAfter.targetBerry?.triggered ?? false, false);
}

console.log("Battle pinch-stat Berry stage smoke: PASS");
