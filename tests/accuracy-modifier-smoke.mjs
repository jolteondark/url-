import assert from "node:assert/strict";
import {
  calcAccuracyModifiersCanonical,
  accuracyCheckCanonical,
  resolveAccuracyDamageActionCanonical,
} from "../runtime/battle-core-accuracy-damage.js";

const modifiers = calcAccuracyModifiersCanonical({
  baseAccuracy: 75,
  externalAccuracyStage: 2,
  externalEvasionStage: 3,
  externalAccuracyMultiplier: 0.75,
  externalEvasionMultiplier: 1,
  gravityTurns: 2,
  micleBerry: true,
  foresight: true,
});
assert.equal(modifiers.baseAccuracy, 75);
assert.equal(modifiers.accuracyStage, 2);
assert.equal(modifiers.evasionStage, 0);
assert.equal(modifiers.accuracyMultiplier, 1.5);
assert.equal(modifiers.evasionMultiplier, 1);
assert.equal(modifiers.micleBerryConsumed, true);
assert.equal(modifiers.sourceComplete, true);
assert.equal(modifiers.sourceSymbol, "Battle::Move#pbCalcAccuracyModifiers");
assert.equal(modifiers.sourceBodySha256, "c6e812650f0f00711c9884aa3e14fd82b53ab3eec370dfc673446eb09c26868e");

const checked = accuracyCheckCanonical({
  baseAccuracy: 75,
  accuracyStage: -4,
  evasionStage: -4,
  randomRoll: 180,
  accuracyModifierInput: {
    externalAccuracyStage: 2,
    externalEvasionStage: 3,
    externalAccuracyMultiplier: 0.75,
    gravityTurns: 1,
    micleBerry: true,
    foresight: true,
  },
});
assert.equal(checked.hit, true);
assert.equal(checked.threshold, 187.5);
assert.equal(checked.accuracyModifierResolution.evasionStage, 0);
assert.equal(checked.accuracyModifierResolution.micleBerryConsumed, true);

const negativeEvasion = calcAccuracyModifiersCanonical({ evasionStage: -2, miracleEye: true });
assert.equal(negativeEvasion.evasionStage, -2);

const alwaysHit = accuracyCheckCanonical({
  baseAccuracy: 70,
  randomRoll: 99,
  accuracyModifierInput: { externalBaseAccuracy: 0 },
});
assert.equal(alwaysHit.hit, true);
assert.equal(alwaysHit.alwaysHitReason, "modified_base_accuracy_zero");
assert.equal(alwaysHit.accuracyModifierResolution.baseAccuracy, 0);

const action = resolveAccuracyDamageActionCanonical({
  kind: "move",
  accuracyInput: {
    baseAccuracy: 75,
    randomRoll: 180,
    accuracyModifierInput: {
      externalAccuracyStage: 2,
      externalEvasionStage: 3,
      externalAccuracyMultiplier: 0.75,
      gravityTurns: 1,
      micleBerry: true,
      foresight: true,
    },
  },
});
assert.equal(action.accuracyHit, true);
assert.equal(action.accuracyResolution.accuracyModifierResolution.sourceComplete, true);

console.log("M0352 accuracy modifier smoke PASS");
