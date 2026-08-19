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

// Ability facts belong to the battling Pokemon/action, not each individual
// secondary effect input. The seeded owner must project those action facts into
// every canonical additional-effect chance calculation.
const shieldDust = materializeSeededSecondaryEffectsCanonical({
  secondaryEffectRandomSeed: 9,
  rounds: [{ actions: [{
    kind: "move",
    calculatedDamage: 20,
    mechanicsGeneration: 9,
    targetHasShieldDust: true,
    secondaryEffectInputs: [{ effectChance: 100, randomRoll: 0, functionCode: "FlinchTarget" }],
  }] }],
});
assert.equal(shieldDust.rounds[0].actions[0].secondaryEffectInputs[0].chance, 0);
assert.equal(shieldDust.rounds[0].actions[0].secondaryEffectInputs[0].triggered, false);

const moldBreaker = materializeSeededSecondaryEffectsCanonical({
  secondaryEffectRandomSeed: 9,
  rounds: [{ actions: [{
    kind: "move",
    calculatedDamage: 20,
    mechanicsGeneration: 9,
    targetHasShieldDust: true,
    moldBreaker: true,
    userHasSereneGrace: true,
    secondaryEffectInputs: [{ effectChance: 30, randomRoll: 59, functionCode: "FlinchTarget" }],
  }] }],
});
assert.equal(moldBreaker.rounds[0].actions[0].secondaryEffectInputs[0].chance, 60);
assert.equal(moldBreaker.rounds[0].actions[0].secondaryEffectInputs[0].triggered, true);

const sheerForce = materializeSeededSecondaryEffectsCanonical({
  secondaryEffectRandomSeed: 9,
  rounds: [{ actions: [{
    kind: "move",
    calculatedDamage: 20,
    userHasSheerForce: true,
    secondaryEffectInputs: [{ effectChance: 100, randomRoll: 0, functionCode: "ParalyzeTarget" }],
  }] }],
});
assert.equal(sheerForce.rounds[0].actions[0].secondaryEffectInputs[0].triggered, false);

console.log(JSON.stringify({ ok: true, rolls: [37,12,72], verticalWired: true, resolvedDamageOwner: true, abilityFactsWired: true }));
