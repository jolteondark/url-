import assert from "node:assert/strict";
import { materializeSeededAccuracyDamageCanonical } from "../runtime/battle-core-seeded-accuracy-damage.js";
import { resolveAccuracyDamageVerticalCanonical } from "../runtime/battle-core-accuracy-damage-vertical.js";

const action = {
  kind: "move",
  accuracyInput: { baseAccuracy: 100 },
  damageInput: {
    level: 50,
    baseDamage: 50,
    attack: 100,
    defense: 100,
    attackStageIndex: 6,
    defenseStageIndex: 6,
    damageMultiplierInput: {
      type: "NORMAL",
      physicalMove: true,
      specialMove: false,
      userHasType: false,
      typeMod: 1,
    },
  },
};

const ordinary = materializeSeededAccuracyDamageCanonical({ combatRandomSeed: 1, rounds: [{ actions: [action] }] });
const ordinaryAction = ordinary.rounds[0].actions[0];
assert.equal(ordinaryAction.damageInput.criticalInput.randomRoll, 7);
assert.equal(ordinaryAction.seededAccuracyDamageRolls.find((roll) => roll.kind === "critical")?.limit, 24);
assert.equal(resolveAccuracyDamageVerticalCanonical(ordinaryAction).criticalResolution.critical, false);

// The sibling critical stream is deterministic and reaches the canonical
// stage-0 1/24 gate. Seed 62 produces roll 0, which pbIsCritical? owns as a crit.
const critical = materializeSeededAccuracyDamageCanonical({ combatRandomSeed: 62, rounds: [{ actions: [action] }] });
const criticalAction = critical.rounds[0].actions[0];
assert.equal(criticalAction.damageInput.criticalInput.randomRoll, 0);
const resolvedCritical = resolveAccuracyDamageVerticalCanonical(criticalAction);
assert.equal(resolvedCritical.criticalResolution.critical, true);
assert.equal(resolvedCritical.damageResolution.criticalResolution.critical, true);

console.log(JSON.stringify({ ok: true, ordinaryRoll: 7, criticalSeed: 62, criticalRoll: 0 }));
