import assert from "node:assert/strict";
import { isCriticalCanonical, damageStatsCanonical } from "../runtime/battle-core-critical-stats.js";
import { resolveAccuracyDamageVerticalCanonical } from "../runtime/battle-core-accuracy-damage-vertical.js";

const critical = isCriticalCanonical({
  externalCriticalStage: 0,
  highCriticalRate: true,
  focusEnergy: 2,
  randomRoll: 23,
  newCriticalHitRateMechanics: true,
});
assert.equal(critical.critical, true);
assert.equal(critical.reason, "guaranteed_ratio");
assert.equal(critical.criticalStage, 3);
assert.equal(critical.ratio, 1);

const blocked = isCriticalCanonical({ luckyChantTurns: 1, externalCriticalStage: 99 });
assert.equal(blocked.critical, false);
assert.equal(blocked.reason, "lucky_chant");

const affection = isCriticalCanonical({
  externalCriticalStage: 0,
  randomRoll: 1,
  affectionEffects: true,
  internalBattle: true,
  userOwnedByPlayer: true,
  userAffectionLevel: 5,
  targetMega: false,
});
assert.equal(affection.critical, true);
assert.equal(affection.affectionCritical, true);

const stats = damageStatsCanonical({
  specialMove: false,
  userAttack: 120,
  userAttackStage: 1,
  userSpAtk: 999,
  targetDefense: 90,
  targetDefenseStage: -1,
  targetSpDef: 999,
});
assert.deepEqual([stats.attack, stats.attackStageIndex, stats.defense, stats.defenseStageIndex], [120, 7, 90, 5]);

const action = resolveAccuracyDamageVerticalCanonical({
  accuracyHit: true,
  damageInput: {
    baseDamage: 50,
    level: 50,
    criticalInput: { externalCriticalStage: 0, highCriticalRate: true, focusEnergy: 2, randomRoll: 23 },
    statInput: { specialMove: false, userAttack: 120, userAttackStage: 1, targetDefense: 90, targetDefenseStage: -1 },
    damageMultiplierInput: { randomRoll: 15, newCriticalHitRateMechanics: true },
  },
});
assert.equal(action.damageResolution.critical, true);
assert.equal(action.damageResolution.damage, 102);
assert.equal(action.damageResolution.criticalResolution.sourceComplete, true);
assert.equal(action.damageResolution.damageStatResolution.sourceComplete, true);
assert.equal(action.damageResolution.damageMultiplierResolution.finalDamageMultiplier, 1.5);

console.log("M0355 critical/stat smoke PASS");
