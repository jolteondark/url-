import { materializeSeededAccuracyDamageCanonical } from "../runtime/battle-core-seeded-accuracy-damage.js";

const action = () => ({
  kind: "move",
  accuracyInput: { baseAccuracy: 100 },
  damageInput: { damageMultiplierInput: {} },
});
const result = materializeSeededAccuracyDamageCanonical({ combatRandomSeed: 1, rounds: [{ actions: [action(), action()] }] });
const rolls = result.rounds[0].actions.map((entry) => [entry.accuracyInput.randomRoll, entry.damageInput.damageMultiplierInput.randomRoll]);
if (JSON.stringify(rolls) !== JSON.stringify([[37, 11], [12, 8]])) throw new Error(`seeded roll mismatch: ${JSON.stringify(rolls)}`);
if (result.rounds[0].actions.some((entry) => entry.seededAccuracyDamageRolls?.length !== 2)) throw new Error("seeded roll provenance missing");
console.log("seeded accuracy/damage smoke PASS");
