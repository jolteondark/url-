import assert from "node:assert/strict";
import { SAFARI_MOVE_MASTERS } from "../runtime/safari-playable-data.js";
import { safariGeneralMoveEffectChanceV108 } from "../runtime/safari-general-move-effect-chance-facts.js";
import { safariGeneralSecondaryFunctionCodeV108 } from "../runtime/safari-general-move-secondary-function-facts.js";
import { prepareReflectedMajorStatusBattleInput } from "../runtime/battle-major-status-runtime-preparation.js";
import { materializeSeededSecondaryEffectsCanonical } from "../runtime/battle-core-seeded-secondary-effect.js";
import { commitBattleSystemsStatusRuntime } from "../runtime/battle-status-runtime-integration.js";

const functionCode = safariGeneralSecondaryFunctionCodeV108("DIRECLAW");
const effectChance = safariGeneralMoveEffectChanceV108("DIRECLAW");
assert.equal(functionCode, "PoisonParalyzeOrSleepTarget");
assert.equal(effectChance, 50);

// The GENERAL move master is normally installed lazily at combat entry. This
// focused shared-owner test injects only canonical generated move facts rather
// than inventing a fixture FunctionCode alias.
SAFARI_MOVE_MASTERS.DIRECLAW = Object.freeze({
  id:"DIRECLAW", name:"Dire Claw", category:"Physical", power:80, accuracy:100,
  total_pp:15, priority:0, type:"POISON", thaws_user:false,
  function_code:functionCode, effect_chance:effectChance,
});

function pokemon(types = ["NORMAL"]) {
  return {
    species:"EEVEE", level:20, hp:50, max_hp:50, status:"NONE", status_count:0,
    types, stats:{ ATTACK:40, DEFENSE:40, SPECIAL_ATTACK:40, SPECIAL_DEFENSE:40, SPEED:40 }, moves:[],
  };
}

function input() {
  return {
    combatRandomSeed:41,
    rounds:[{ actions:[{
      kind:"move", battlerIndex:0, targetBattlerIndex:1, moveId:"DIRECLAW",
      accuracyInput:{ baseAccuracy:100, randomRoll:0 },
    }] }],
  };
}

const damagingTurn = { operations:[
  { op:"use_move", round:1, action:0 },
  { op:"reduce_hp", round:1, action:0, hpBefore:50, hpAfter:30, amount:20 },
] };

for (const [choiceIndex, expectedStatus] of [[0,"POISON"],[1,"PARALYSIS"]]) {
  const target = pokemon();
  const prepared = prepareReflectedMajorStatusBattleInput({ battleInput:input(), pokemon:target, reflectedBattlerIndex:1 });
  const action = prepared.rounds[0].actions[0];
  assert.deepEqual(action.secondaryEffectInputs[0].randomChoiceValues, ["POISON","PARALYSIS","SLEEP"]);
  action.secondaryEffectInputs[0].randomRoll = 0;
  action.secondaryEffectInputs[0].randomChoiceIndex = choiceIndex;
  const materialized = materializeSeededSecondaryEffectsCanonical(prepared);
  materialized.rounds[0].actions[0].accuracyResolution = { hit:true };
  const committed = commitBattleSystemsStatusRuntime({ battleInput:materialized, turn:damagingTurn, pokemon:target, reflectedBattlerIndex:1 });
  assert.equal(committed.pokemon.status, expectedStatus);
  assert.equal(committed.pokemon.status_count, 0);
  assert.equal(committed.commits.length, 1);
}

for (const [sleepRoll, expectedCount] of [[0,2],[1,3],[2,4]]) {
  const target = pokemon();
  const prepared = prepareReflectedMajorStatusBattleInput({ battleInput:input(), pokemon:target, reflectedBattlerIndex:1 });
  const action = prepared.rounds[0].actions[0];
  action.secondaryEffectInputs[0].randomRoll = 0;
  action.secondaryEffectInputs[0].randomChoiceIndex = 2;
  action.secondaryEffectInputs[0].randomChoiceCountRoll = sleepRoll;
  const materialized = materializeSeededSecondaryEffectsCanonical(prepared);
  const resolvedAction = materialized.rounds[0].actions[0];
  resolvedAction.accuracyResolution = { hit:true };
  assert.equal(resolvedAction.secondaryEffectInputs[0].randomChoiceValue, "SLEEP");
  assert.equal(resolvedAction.secondaryEffectInputs[0].randomChoiceCount, expectedCount);
  const committed = commitBattleSystemsStatusRuntime({ battleInput:materialized, turn:damagingTurn, pokemon:target, reflectedBattlerIndex:1 });
  assert.equal(committed.pokemon.status, "SLEEP");
  assert.equal(committed.pokemon.status_count, expectedCount, "Dire Claw sleep must use canonical 2 + rand(3) duration");
  assert.equal(committed.commits.length, 1);
}

{
  const target = pokemon(["STEEL"]);
  const prepared = prepareReflectedMajorStatusBattleInput({ battleInput:input(), pokemon:target, reflectedBattlerIndex:1 });
  const action = prepared.rounds[0].actions[0];
  action.secondaryEffectInputs[0].randomRoll = 0;
  action.secondaryEffectInputs[0].randomChoiceIndex = 0; // POISON
  const materialized = materializeSeededSecondaryEffectsCanonical(prepared);
  materialized.rounds[0].actions[0].accuracyResolution = { hit:true };
  const committed = commitBattleSystemsStatusRuntime({ battleInput:materialized, turn:damagingTurn, pokemon:target, reflectedBattlerIndex:1 });
  assert.equal(committed.pokemon.status, "NONE", "chosen immune status must fail rather than reroll");
  assert.equal(committed.commits.length, 0);
}

console.log("Dire Claw random major-status shared contract smoke: ok");
