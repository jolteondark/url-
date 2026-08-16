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
console.log(JSON.stringify({ ok: true, rolls: [37,12,72], verticalWired: true }));
