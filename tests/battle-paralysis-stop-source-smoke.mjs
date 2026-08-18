import assert from "node:assert/strict";
import { tryUseMoveCanonical, TRY_USE_MOVE_BODY_SHA256 } from "../runtime/battle-core-try-use-move.js";
import { materializeSeededAccuracyDamageCanonical } from "../runtime/battle-core-seeded-accuracy-damage.js";
import { prepareCombatTurnInputCanonical } from "../runtime/battle-core-combat-turn.js";

assert.equal(TRY_USE_MOVE_BODY_SHA256, "3b3525b6ff1c2c5cbbebdf4e1ac0939e5f7c5bf1d1bd772a45fcf75010b49911");
assert.equal(tryUseMoveCanonical({ status: "PARALYSIS", paralysisRoll4: 0 }).success, false);
assert.equal(tryUseMoveCanonical({ status: "PARALYSIS", paralysisRoll4: 1 }).success, true);
assert.equal(tryUseMoveCanonical({ status: "PARALYSIS", paralysisRoll4: 2 }).success, true);
assert.equal(tryUseMoveCanonical({ status: "PARALYSIS", paralysisRoll4: 3 }).success, true);

const action = {
  kind: "move",
  moveId: "TACKLE",
  moveIndex: 0,
  targetIndex: 1,
  accuracyInput: { baseAccuracy: 100 },
  useMoveInput: {
    moveId: "TACKLE",
    moveIndex: 0,
    targetIndex: 1,
    movePresent: true,
    tryUseMoveInput: { status: "PARALYSIS" },
  },
};

const seededStop = materializeSeededAccuracyDamageCanonical({ combatRandomSeed: 3, rounds: [{ actions: [action] }] });
assert.equal(seededStop.rounds[0].actions[0].useMoveInput.tryUseMoveInput.paralysisRoll4, 0);
assert.equal(seededStop.rounds[0].actions[0].accuracyInput.randomRoll, 24);
assert.equal(seededStop.rounds[0].actions[0].seededAccuracyDamageRolls[0].kind, "paralysis_stop");

const preparedStop = prepareCombatTurnInputCanonical({ combatRandomSeed: 3, rounds: [{ actions: [action] }] });
assert.equal(preparedStop.rounds[0].actions[0].tryUseMoveResolution.reason, "paralysis");
assert.equal(preparedStop.rounds[0].actions[0].moveSkipped, true);

// Existing accuracy/damage stream stays unchanged by the sibling move-use RNG.
const accuracyOnly = materializeSeededAccuracyDamageCanonical({
  combatRandomSeed: 1,
  rounds: [{ actions: [{ kind: "move", accuracyInput: { baseAccuracy: 100 }, damageInput: { damageMultiplierInput: { type: "NORMAL" } } }] }],
});
assert.equal(accuracyOnly.rounds[0].actions[0].accuracyInput.randomRoll, 37);
assert.equal(accuracyOnly.rounds[0].actions[0].damageInput.damageMultiplierInput.randomRoll, 11);

console.log(JSON.stringify({ ok: true, canonicalParalysisRoll4: true, seed3Stops: true, establishedAccuracyTranscriptPreserved: true }));
