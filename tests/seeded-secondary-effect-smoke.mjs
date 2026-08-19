import assert from "node:assert/strict";
import { materializeSeededSecondaryEffectsCanonical } from "../runtime/battle-core-seeded-secondary-effect.js";
import { prepareCombatTurnInputCanonical } from "../runtime/battle-core-combat-turn.js";

const input = {
  secondaryEffectRandomSeed: 1,
  rounds: [{ actions: [{ kind: "move", secondaryEffectInputs: [
    { calcDamage: 20, moveAdditionalEffect: 50 },
    { calcDamage: 0, moveAdditionalEffect: 100 },
    { calcDamage: 20, moveAdditionalEffect: 10, randomRoll: 4 },
    { calcDamage: 20, effectChance: 30, userHasSereneGrace: true },
    { calcDamage: 20, moveAdditionalEffect: 10 },
  ] }] }],
};
const prepared = materializeSeededSecondaryEffectsCanonical(input);
assert.deepEqual(prepared.rounds[0].actions[0].secondaryEffectInputs.map((x) => x.randomRoll), [37, undefined, 4, 12, 72]);
assert.deepEqual(prepared.rounds[0].actions[0].secondaryEffectInputs.map((x) => x.triggered), [true, false, true, true, false]);
const vertical = prepareCombatTurnInputCanonical(input);
assert.equal(vertical.rounds[0].actions[0].secondaryEffectInputs[0].randomRoll, 37);

const resolvedDamageInput = {
  secondaryEffectRandomSeed: 1,
  rounds: [{ actions: [{
    kind: "move",
    calculatedDamage: 20,
    secondaryEffectInputs: [
      { effectChance: 100, randomRoll: 0, functionCode: "FlinchTarget" },
      { calcDamage: 0, effectChance: 100, randomRoll: 0, functionCode: "FlinchTarget" },
    ],
  }] }],
};
const resolvedDamage = materializeSeededSecondaryEffectsCanonical(resolvedDamageInput);
assert.equal(resolvedDamage.rounds[0].actions[0].secondaryEffectInputs[0].calcDamage, 20);
assert.equal(resolvedDamage.rounds[0].actions[0].secondaryEffectInputs[0].triggered, true);
assert.equal(resolvedDamage.rounds[0].actions[0].secondaryEffectInputs[1].calcDamage, 0);
assert.equal(resolvedDamage.rounds[0].actions[0].secondaryEffectInputs[1].triggered, false);

console.log(JSON.stringify({ ok: true, rolls: [37,12,72], verticalWired: true, resolvedDamageOwner: true }));
