import assert from "node:assert/strict";
import { SAFARI_MOVE_MASTERS } from "../runtime/safari-playable-data.js";
import { safariGeneralSecondaryFunctionCodeV108 } from "../runtime/safari-general-move-secondary-function-facts.js";
import { prepareReflectedMajorStatusBattleInput } from "../runtime/battle-major-status-runtime-preparation.js";
import { materializeSeededSecondaryEffectsCanonical } from "../runtime/battle-core-seeded-secondary-effect.js";
import { commitBattleSystemsStatusRuntime } from "../runtime/battle-status-runtime-integration.js";

assert.equal(safariGeneralSecondaryFunctionCodeV108("TRIATTACK"), "ParalyzeBurnOrFreezeTarget");
assert.equal(SAFARI_MOVE_MASTERS.TRIATTACK.function_code, "ParalyzeBurnOrFreezeTarget");
assert.equal(Number(SAFARI_MOVE_MASTERS.TRIATTACK.effect_chance) > 0, true);

function pokemon(types = ["NORMAL"]) {
  return {
    species:"EEVEE", level:20, hp:50, max_hp:50, status:"NONE", status_count:0,
    types, stats:{ ATTACK:40, DEFENSE:40, SPECIAL_ATTACK:40, SPECIAL_DEFENSE:40, SPEED:40 }, moves:[],
  };
}

function input() {
  return {
    combatRandomSeed:37,
    rounds:[{ actions:[{
      kind:"move", battlerIndex:0, targetBattlerIndex:1, moveId:"TRIATTACK",
      accuracyInput:{ baseAccuracy:100, randomRoll:0 },
    }] }],
  };
}

const damagingTurn = { operations:[
  { op:"use_move", round:1, action:0 },
  { op:"reduce_hp", round:1, action:0, hpBefore:50, hpAfter:30, amount:20 },
] };

for (const [choiceIndex, expectedStatus] of [[0,"PARALYSIS"],[1,"BURN"],[2,"FROZEN"]]) {
  const target = pokemon();
  const prepared = prepareReflectedMajorStatusBattleInput({ battleInput:input(), pokemon:target, reflectedBattlerIndex:1 });
  const action = prepared.rounds[0].actions[0];
  assert.equal(action.secondaryEffectInputs.length, 1);
  assert.deepEqual(action.secondaryEffectInputs[0].randomChoiceValues, ["PARALYSIS","BURN","FROZEN"]);
  assert.equal(action.battleStatusInput.newStatusFromSecondaryChoice, true);
  action.secondaryEffectInputs[0].randomRoll = 0;
  action.secondaryEffectInputs[0].randomChoiceIndex = choiceIndex;
  const materialized = materializeSeededSecondaryEffectsCanonical(prepared);
  const resolvedAction = materialized.rounds[0].actions[0];
  resolvedAction.accuracyResolution = { hit:true };
  assert.equal(resolvedAction.secondaryEffectInputs[0].triggered, true);
  assert.equal(resolvedAction.secondaryEffectInputs[0].randomChoiceValue, expectedStatus);
  const committed = commitBattleSystemsStatusRuntime({ battleInput:materialized, turn:damagingTurn, pokemon:target, reflectedBattlerIndex:1 });
  assert.equal(committed.pokemon.status, expectedStatus);
  assert.equal(committed.commits.length, 1);
}

{
  const target = pokemon(["FIRE"]);
  const prepared = prepareReflectedMajorStatusBattleInput({ battleInput:input(), pokemon:target, reflectedBattlerIndex:1 });
  const action = prepared.rounds[0].actions[0];
  action.secondaryEffectInputs[0].randomRoll = 0;
  action.secondaryEffectInputs[0].randomChoiceIndex = 1; // BURN
  const materialized = materializeSeededSecondaryEffectsCanonical(prepared);
  materialized.rounds[0].actions[0].accuracyResolution = { hit:true };
  const committed = commitBattleSystemsStatusRuntime({ battleInput:materialized, turn:damagingTurn, pokemon:target, reflectedBattlerIndex:1 });
  assert.equal(committed.pokemon.status, "NONE", "chosen immune status must fail rather than reroll");
  assert.equal(committed.commits.length, 0);
}

console.log("Tri Attack random major-status shared contract smoke: ok");
