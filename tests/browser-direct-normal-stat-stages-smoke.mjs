import assert from "node:assert/strict";
import { buildBrowserBattleActionInput } from "../runtime/browser-battle-round-runtime.js";
import {
  applyBattleStatStageChangesCanonical,
  createBattleStatStageStateCanonical,
  injectBattleStatStagesIntoActionCanonical,
  resetBattleStatStagesForBattlerCanonical,
  resolveBattleStatStageChangesCanonical,
} from "../runtime/battle-core-stat-stages.js";
import { calcDamageCanonical, accuracyCheckCanonical } from "../runtime/battle-core-accuracy-damage.js";
import { resolveBattleSpeedCanonical } from "../runtime/battle-core-speed.js";
import { safariGeneralSecondaryFunctionCodeV108 } from "../runtime/safari-general-move-secondary-function-facts.js";

const pokemon = (species, speed = 50) => ({
  species,
  level: 20,
  hp: 100,
  max_hp: 100,
  status: "NONE",
  ability: "NONE",
  types: ["NORMAL"],
  stats: { ATTACK: 80, DEFENSE: 80, SPECIAL_ATTACK: 80, SPECIAL_DEFENSE: 80, SPEED: speed },
  moves: [{ id: "TACKLE", pp: 35, ppup: 0 }],
});
const move = (id, category, power, accuracy, functionCode) => ({
  id,
  name: id,
  type: "NORMAL",
  category,
  power,
  accuracy,
  total_pp: 40,
  priority: 0,
  function_code: functionCode,
});

assert.equal(safariGeneralSecondaryFunctionCodeV108("GROWL"), "LowerTargetAttack1");
assert.equal(safariGeneralSecondaryFunctionCodeV108("TAILWHIP"), "LowerTargetDefense1");
assert.equal(safariGeneralSecondaryFunctionCodeV108("AGILITY"), "RaiseUserSpeed2");
assert.equal(safariGeneralSecondaryFunctionCodeV108("SANDATTACK"), "LowerTargetAccuracy1");

const player = pokemon("EEVEE", 40);
const foe = pokemon("RATTATA", 60);
const tackle = move("TACKLE", "Physical", 40, 100, "None");
const growl = move("GROWL", "Status", 0, 100, "LowerTargetAttack1");
const tailWhip = move("TAILWHIP", "Status", 0, 100, "LowerTargetDefense1");
const agility = move("AGILITY", "Status", 0, 0, "RaiseUserSpeed2");
const sandAttack = move("SANDATTACK", "Status", 0, 100, "LowerTargetAccuracy1");

const growlAction = buildBrowserBattleActionInput({ actor: player, target: foe, move: growl, moveIndex: 0, battlerIndex: 0, targetBattlerIndex: 1, randomRoll: 0, reflectPp: false });
assert.equal(growlAction.damageInput, undefined, "Status moves must stay out of the damage path");
assert.deepEqual(growlAction.statStageEffectInput.changes, [{ subject: "target", stat: "ATTACK", delta: -1 }]);

let stages = createBattleStatStageStateCanonical();
stages = applyBattleStatStageChangesCanonical(stages, resolveBattleStatStageChangesCanonical(growl.function_code), 0, 1).state;
const foeTackle = buildBrowserBattleActionInput({ actor: foe, target: player, move: tackle, moveIndex: 0, battlerIndex: 1, targetBattlerIndex: 0, randomRoll: 0, reflectPp: false });
const neutralFoeTackle = injectBattleStatStagesIntoActionCanonical(foeTackle, createBattleStatStageStateCanonical());
const growledFoeTackle = injectBattleStatStagesIntoActionCanonical(foeTackle, stages);
assert.equal(growledFoeTackle.damageInput.attackStageIndex, 5);
assert.ok(calcDamageCanonical(growledFoeTackle.damageInput).damage < calcDamageCanonical(neutralFoeTackle.damageInput).damage, "Growl must lower the next physical damage");

stages = createBattleStatStageStateCanonical();
stages = applyBattleStatStageChangesCanonical(stages, resolveBattleStatStageChangesCanonical(tailWhip.function_code), 0, 1).state;
const playerTackle = buildBrowserBattleActionInput({ actor: player, target: foe, move: tackle, moveIndex: 0, battlerIndex: 0, targetBattlerIndex: 1, randomRoll: 0, reflectPp: false });
const neutralPlayerTackle = injectBattleStatStagesIntoActionCanonical(playerTackle, createBattleStatStageStateCanonical());
const whippedPlayerTackle = injectBattleStatStagesIntoActionCanonical(playerTackle, stages);
assert.equal(whippedPlayerTackle.damageInput.defenseStageIndex, 5);
assert.ok(calcDamageCanonical(whippedPlayerTackle.damageInput).damage > calcDamageCanonical(neutralPlayerTackle.damageInput).damage, "Tail Whip must raise the next physical damage received");

stages = createBattleStatStageStateCanonical();
stages = applyBattleStatStageChangesCanonical(stages, resolveBattleStatStageChangesCanonical(agility.function_code), 0, 1).state;
assert.ok(resolveBattleSpeedCanonical({ baseSpeed: player.stats.SPEED, speedStage: stages[0].SPEED }) > resolveBattleSpeedCanonical({ baseSpeed: foe.stats.SPEED, speedStage: stages[1].SPEED }), "Agility must be able to reverse action order on the next round");

stages = createBattleStatStageStateCanonical();
stages = applyBattleStatStageChangesCanonical(stages, resolveBattleStatStageChangesCanonical(sandAttack.function_code), 0, 1).state;
const sandedFoeTackle = injectBattleStatStagesIntoActionCanonical(foeTackle, stages);
assert.equal(sandedFoeTackle.accuracyInput.accuracyStage, -1);
assert.equal(accuracyCheckCanonical({ ...neutralFoeTackle.accuracyInput, randomRoll: 80 }).hit, true);
assert.equal(accuracyCheckCanonical({ ...sandedFoeTackle.accuracyInput, randomRoll: 80 }).hit, false, "Sand Attack must feed the accuracy stage into the canonical accuracy owner");

stages = createBattleStatStageStateCanonical();
for (let i = 0; i < 8; i += 1) stages = applyBattleStatStageChangesCanonical(stages, [{ subject: "user", stat: "ATTACK", delta: 2 }], 0, 1).state;
assert.equal(stages[0].ATTACK, 6, "positive stages cap at +6");
for (let i = 0; i < 8; i += 1) stages = applyBattleStatStageChangesCanonical(stages, [{ subject: "target", stat: "EVASION", delta: -2 }], 0, 1).state;
assert.equal(stages[1].EVASION, -6, "negative stages cap at -6");
stages = resetBattleStatStagesForBattlerCanonical(stages, 0);
assert.equal(stages[0].ATTACK, 0, "switch/replacement resets the incoming battler stages");
assert.equal(stages[1].EVASION, -6, "resetting one battler must not erase the opposing battler stages");

console.log("browser direct-normal stat stages smoke: PASS");
