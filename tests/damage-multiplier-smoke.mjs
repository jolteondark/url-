import assert from "node:assert/strict";
import { calcDamageMultipliersCanonical, calcDamageCanonical } from "../runtime/battle-core-accuracy-damage.js";

const rainSpreadCrit = {
  type: "FIRE", mechanicsGeneration: 9, numTargets: 2, effectiveWeather: "Rain",
  critical: true, newCriticalHitRateMechanics: true, randomRoll: 15,
  userHasType: true, adaptability: false, typeMod: 2,
  specialMove: true,
};
const m1 = calcDamageMultipliersCanonical(rainSpreadCrit);
assert.equal(m1.sourceComplete, true);
assert.equal(m1.sourceSymbol, "Battle::Move#pbCalcDamageMultipliers");
assert.equal(m1.sourceBodySha256, "d4c7c2e7dd7237f911b20f61ca809a6e08087695d17a2dc335ae197b4b327b39");
assert.equal(m1.finalDamageMultiplier, 1.6875);
const d1 = calcDamageCanonical({
  baseDamage: 90, attack: 100, defense: 80, level: 50, critical: true,
  damageMultiplierInput: rainSpreadCrit,
});
assert.equal(d1.damage, 86);
assert.equal(d1.damageMultiplierResolution.sourceComplete, true);

const electric = calcDamageMultipliersCanonical({
  type: "ELECTRIC", mechanicsGeneration: 9, chargeTurns: 1,
  terrain: "Electric", userAffectedByTerrain: true,
  randomRoll: 0, userHasType: true, typeMod: 1,
});
assert.equal(electric.powerMultiplier, 2.6);
assert.equal(electric.finalDamageMultiplier, 1.275);

const burnReflect = calcDamageMultipliersCanonical({
  type: "NORMAL", mechanicsGeneration: 9, physicalMove: true,
  userStatus: "BURN", damageReducedByBurn: true, guts: false,
  reflectTurns: 5, sideBattlerCount: 1, randomRoll: 15,
  userHasType: true, typeMod: 1,
});
assert.equal(burnReflect.finalDamageMultiplier, 0.375);

const injected = calcDamageMultipliersCanonical({
  type: "WATER", mechanicsGeneration: 9, effectiveWeather: "Rain", randomRoll: 15,
  externalPowerMultiplier: 1.2, externalAttackMultiplier: 1.1,
  externalDefenseMultiplier: 0.8, externalFinalDamageMultiplier: 1.25,
  movePowerMultiplier: 1.5, moveFinalDamageMultiplier: 0.5,
});
assert.equal(injected.powerMultiplier, 1.7999999999999998);
assert.equal(injected.attackMultiplier, 1.1);
assert.equal(injected.defenseMultiplier, 0.8);
assert.equal(injected.finalDamageMultiplier, 0.9375);

const legacy = calcDamageCanonical({ baseDamage: 90, attack: 100, defense: 80, level: 50, finalDamageMultiplier: 2 });
assert.equal(legacy.damage, 102);
assert.equal(legacy.damageMultiplierResolution, undefined);

console.log("PASS M0350 damage multiplier smoke");
