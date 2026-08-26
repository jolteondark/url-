import assert from "node:assert/strict";
import {
  createSeededSecondaryEffectMaterializerCanonical,
  materializeSeededSecondaryEffectsCanonical,
} from "../runtime/battle-core-seeded-secondary-effect.js";

const SEED = 24681357;

function secondaryAction({ hit = true, calculatedDamage = 12, label = "move" } = {}) {
  return {
    kind: "move",
    label,
    accuracyResolution: { hit },
    calculatedDamage,
    secondaryEffectInputs: [
      {
        functionCode: "BurnTarget",
        chance: 30,
        // Browser adapters may have a pre-resolution placeholder here. A
        // resolved miss must override it and must not consume secondary RNG.
        calcDamage: 1,
      },
    ],
  };
}

{
  const baseline = createSeededSecondaryEffectMaterializerCanonical(SEED);
  const firstHit = baseline.materializeAction(secondaryAction({ label: "baseline" }));
  const expectedFirstRoll = firstHit.secondaryEffectInputs[0].randomRoll;
  assert.equal(Number.isInteger(expectedFirstRoll), true, "eligible hit must consume one secondary roll");

  const afterMiss = createSeededSecondaryEffectMaterializerCanonical(SEED);
  const missed = afterMiss.materializeAction(secondaryAction({
    hit: false,
    calculatedDamage: 0,
    label: "miss",
  }));
  assert.equal(missed.secondaryEffectInputs[0].triggered, false);
  assert.equal(missed.secondaryEffectInputs[0].randomRoll, undefined, "miss must not consume secondary RNG");
  assert.equal(missed.seededSecondaryEffectRolls, undefined, "miss must not record a secondary RNG roll");

  const hitAfterMiss = afterMiss.materializeAction(secondaryAction({ label: "hit-after-miss" }));
  assert.equal(
    hitAfterMiss.secondaryEffectInputs[0].randomRoll,
    expectedFirstRoll,
    "first resolved hit after a miss must receive the same first RNG roll",
  );
}

{
  const expected = createSeededSecondaryEffectMaterializerCanonical(SEED);
  const expectedFirst = expected.materializeAction(secondaryAction({ label: "expected-first" }));
  const expectedSecond = expected.materializeAction(secondaryAction({ label: "expected-second" }));

  const actualOrder = createSeededSecondaryEffectMaterializerCanonical(SEED);
  const storedSecondButExecutedFirst = actualOrder.materializeAction(secondaryAction({ label: "stored-index-1" }));
  const storedFirstButExecutedSecond = actualOrder.materializeAction(secondaryAction({ label: "stored-index-0" }));

  assert.equal(
    storedSecondButExecutedFirst.secondaryEffectInputs[0].randomRoll,
    expectedFirst.secondaryEffectInputs[0].randomRoll,
    "first actual action must consume the first secondary RNG roll",
  );
  assert.equal(
    storedFirstButExecutedSecond.secondaryEffectInputs[0].randomRoll,
    expectedSecond.secondaryEffectInputs[0].randomRoll,
    "second actual action must consume the second secondary RNG roll",
  );
}

{
  const bulk = materializeSeededSecondaryEffectsCanonical({
    secondaryEffectRandomSeed: SEED,
    rounds: [{
      actions: [
        secondaryAction({ hit: false, calculatedDamage: 0, label: "bulk-miss" }),
        secondaryAction({ label: "bulk-hit" }),
      ],
    }],
  });
  const baseline = createSeededSecondaryEffectMaterializerCanonical(SEED)
    .materializeAction(secondaryAction({ label: "baseline-hit" }));

  assert.equal(bulk.rounds[0].actions[0].secondaryEffectInputs[0].randomRoll, undefined);
  assert.equal(
    bulk.rounds[0].actions[1].secondaryEffectInputs[0].randomRoll,
    baseline.secondaryEffectInputs[0].randomRoll,
    "legacy bulk materialization must also avoid consuming RNG for resolved misses",
  );
}

console.log("battle core secondary RNG order smoke passed");
