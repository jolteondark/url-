import assert from "node:assert/strict";
import {
  applyBattleAbilityItemActionAfterCanonical,
} from "../runtime/battle-core-combat-turn.js";
import {
  reflectBattleCoreAbilityItemActionAfterHpToPokemonRuntime,
} from "../runtime/battle-runtime-integration.js";
import { createBattleStatStageStateCanonical } from "../runtime/battle-core-stat-stages.js";

function immunity(targetAbility, afterEffect) {
  return {
    targetAbility,
    immune: true,
    source: "ability_type_immunity",
    afterEffect,
  };
}

function immuneAction(typeImmunityResolution) {
  return {
    kind: "move",
    battlerIndex: 0,
    targetBattlerIndex: 1,
    moveId: "WATERGUN",
    moveCategory: "Special",
    hpBefore: 40,
    totalHp: 100,
    abilityItemTypeImmunityResolution: typeImmunityResolution,
  };
}

{
  const applied = applyBattleAbilityItemActionAfterCanonical(
    immuneAction(immunity("WATERABSORB", { kind: "heal", hpFraction: [1, 4] })),
    createBattleStatStageStateCanonical(),
  );
  assert.equal(applied.action.abilityItemActionAfter.typeImmunityAfterEffect.triggered, true);
  assert.equal(applied.action.abilityItemActionAfter.typeImmunityAfterEffect.hpDelta, 25);
  assert.equal(applied.statStages[1].SPECIAL_ATTACK, 0);

  const reflected = reflectBattleCoreAbilityItemActionAfterHpToPokemonRuntime(
    { hp: 40, max_hp: 100 },
    { rounds: [{ priorityOrder: [0], actions: [applied.action] }] },
    1,
  );
  assert.equal(reflected.hp, 65, "Water Absorb heal must reach the persistent target Pokemon");
}

{
  const applied = applyBattleAbilityItemActionAfterCanonical(
    immuneAction(immunity("STORMDRAIN", {
      kind: "stat_stage",
      changes: [{ subject: "target", stat: "SPECIAL_ATTACK", delta: 1 }],
    })),
    createBattleStatStageStateCanonical(),
  );
  assert.equal(applied.action.abilityItemActionAfter.typeImmunityAfterEffect.triggered, true);
  assert.equal(applied.statStages[1].SPECIAL_ATTACK, 1, "Storm Drain must update the live Battle stat-stage owner before the next action");
  assert.equal(applied.statStages[0].SPECIAL_ATTACK, 0);
}

{
  const applied = applyBattleAbilityItemActionAfterCanonical(
    immuneAction({ immune: true, targetAbility: "LEVITATE", afterEffect: null }),
    createBattleStatStageStateCanonical(),
  );
  assert.equal(applied.action.abilityItemActionAfter.typeImmunityAfterEffect.triggered, false);
  assert.deepEqual(applied.statStages, createBattleStatStageStateCanonical());
}

{
  const skipped = {
    ...immuneAction(immunity("WATERABSORB", { kind: "heal", hpFraction: [1, 4] })),
    moveSkipped: true,
    lastMoveFailed: true,
  };
  const applied = applyBattleAbilityItemActionAfterCanonical(skipped, createBattleStatStageStateCanonical());
  assert.equal(applied.action.abilityItemActionAfter, undefined, "a move that never executes must not trigger an absorb after-effect");
}

console.log("browser Battle live type-immunity after-effect smoke: PASS");
