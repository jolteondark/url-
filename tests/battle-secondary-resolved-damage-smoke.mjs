import assert from "node:assert/strict";
import { SAFARI_MOVE_MASTERS } from "../runtime/safari-playable-data.js";
import { prepareReflectedMajorStatusBattleInput } from "../runtime/battle-major-status-runtime-preparation.js";
import { createSeededSecondaryEffectMaterializerCanonical } from "../runtime/battle-core-seeded-secondary-effect.js";

function targetPokemon() {
  return {
    species: "EEVEE",
    level: 10,
    hp: 100,
    max_hp: 100,
    status: "NONE",
    status_count: 0,
    types: ["NORMAL"],
    stats: {
      ATTACK: 10,
      DEFENSE: 10,
      SPECIAL_ATTACK: 10,
      SPECIAL_DEFENSE: 10,
      SPEED: 10,
    },
    moves: [{ id: "TACKLE", pp: 35, ppup: 0 }],
  };
}

function prepareSecondaryAction(moveId) {
  const prepared = prepareReflectedMajorStatusBattleInput({
    battleInput: {
      combatRandomSeed: 123,
      rounds: [{
        actions: [{
          kind: "move",
          moveId,
          battlerIndex: 0,
          targetBattlerIndex: 1,
        }],
      }],
    },
    pokemon: targetPokemon(),
    reflectedBattlerIndex: 1,
  });
  return prepared.rounds[0].actions[0];
}

function materialize(action, { hit = true, damage = 0, seed = 7 } = {}) {
  return createSeededSecondaryEffectMaterializerCanonical(seed).materializeAction({
    ...action,
    accuracyResolution: { hit },
    calculatedDamage: damage,
  });
}

assert.equal(SAFARI_MOVE_MASTERS.THUNDERSHOCK.function_code, "ParalyzeTarget");
assert.equal(SAFARI_MOVE_MASTERS.THUNDERSHOCK.effect_chance, 10);
const thunderShock = prepareSecondaryAction("THUNDERSHOCK");
assert.equal(thunderShock.secondaryEffectInputs.length, 1);
assert.equal(thunderShock.secondaryEffectInputs[0].functionCode, "ParalyzeTarget");
assert.equal(Object.hasOwn(thunderShock.secondaryEffectInputs[0], "calcDamage"), false,
  "major-status secondary builders must defer calcDamage to resolved combat");

const thunderZero = materialize(thunderShock, { hit: true, damage: 0 });
assert.equal(thunderZero.secondaryEffectInputs[0].calcDamage, 0);
assert.equal(thunderZero.secondaryEffectInputs[0].triggered, false);
assert.equal(Object.hasOwn(thunderZero, "seededSecondaryEffectRolls"), false,
  "zero resolved damage must not consume secondary-effect RNG");

const thunderMiss = materialize(thunderShock, { hit: false, damage: 20 });
assert.equal(thunderMiss.secondaryEffectInputs[0].calcDamage, 0);
assert.equal(thunderMiss.secondaryEffectInputs[0].triggered, false);
assert.equal(Object.hasOwn(thunderMiss, "seededSecondaryEffectRolls"), false,
  "a miss must not consume secondary-effect RNG even if a stale damage value is present");

const thunderHit = materialize(thunderShock, { hit: true, damage: 20 });
assert.equal(thunderHit.secondaryEffectInputs[0].calcDamage, 20);
assert.ok(Array.isArray(thunderHit.seededSecondaryEffectRolls));
assert.equal(thunderHit.seededSecondaryEffectRolls.length, 1);
assert.equal(thunderHit.seededSecondaryEffectRolls[0].kind, "secondary_effect");

assert.equal(SAFARI_MOVE_MASTERS.BITE.function_code, "FlinchTarget");
assert.equal(SAFARI_MOVE_MASTERS.BITE.effect_chance, 30);
const bite = prepareSecondaryAction("BITE");
const flinch = bite.secondaryEffectInputs.find((effect) => effect.functionCode === "FlinchTarget");
assert.ok(flinch, "Bite must project its flinch secondary into the shared seeded owner");
assert.equal(Object.hasOwn(flinch, "calcDamage"), false,
  "transient secondary builders must defer calcDamage to resolved combat");

const biteZero = materialize(bite, { hit: true, damage: 0 });
assert.equal(biteZero.secondaryEffectInputs[0].calcDamage, 0);
assert.equal(Object.hasOwn(biteZero, "seededSecondaryEffectRolls"), false,
  "zero-damage flinch must not consume secondary-effect RNG");

const biteHit = materialize(bite, { hit: true, damage: 12 });
assert.equal(biteHit.secondaryEffectInputs[0].calcDamage, 12);
assert.ok(Array.isArray(biteHit.seededSecondaryEffectRolls));
assert.equal(biteHit.seededSecondaryEffectRolls[0].kind, "secondary_effect");

console.log("resolved-damage secondary RNG smoke: ok");
