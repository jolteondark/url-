import assert from "node:assert/strict";
import { materializeSeededAccuracyDamageCanonical } from "../runtime/battle-core-seeded-accuracy-damage.js";
import { prepareCombatTurnInputCanonical } from "../runtime/battle-core-combat-turn.js";

const action = () => ({
  kind: "move",
  accuracyInput: { baseAccuracy: 100 },
  damageInput: { damageMultiplierInput: { type: "NORMAL" } },
});

const seeded = materializeSeededAccuracyDamageCanonical({
  combatRandomSeed: 1,
  rounds: [{ actions: [action(), action()] }],
});
assert.deepEqual(
  seeded.rounds[0].actions.map((entry) => [entry.accuracyInput.randomRoll, entry.damageInput.damageMultiplierInput.randomRoll]),
  [[37, 11], [12, 8]],
);
assert.equal(seeded.rounds[0].actions[0].seededAccuracyDamageRolls[0].sourceBodySha256, "55a2d0be4286dfa8624828bbf9899ed7760c9c15a2a1689ff01f0e89ea7d3517");
assert.equal(seeded.rounds[0].actions[0].seededAccuracyDamageRolls[1].sourceBodySha256, "d4c7c2e7dd7237f911b20f61ca809a6e08087695d17a2dc335ae197b4b327b39");

const explicit = materializeSeededAccuracyDamageCanonical({
  combatRandomSeed: 1,
  rounds: [{ actions: [{ ...action(), accuracyInput: { baseAccuracy: 100, randomRoll: 99 } }, action()] }],
});
assert.equal(explicit.rounds[0].actions[0].accuracyInput.randomRoll, 99);
assert.equal(explicit.rounds[0].actions[0].damageInput.damageMultiplierInput.randomRoll, 5);
assert.equal(explicit.rounds[0].actions[1].accuracyInput.randomRoll, 12);

const prepared = prepareCombatTurnInputCanonical({ combatRandomSeed: 1, rounds: [{ actions: [] }] });
assert.equal(prepared.combatRandomSeed, 1);
console.log("seeded combat rolls smoke PASS");
