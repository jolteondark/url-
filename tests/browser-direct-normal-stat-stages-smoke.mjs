import assert from "node:assert/strict";
import fs from "node:fs";
import { buildBrowserBattleActionInput } from "../runtime/browser-battle-round-runtime.js";
import { prepareCombatTurnInputCanonical } from "../runtime/battle-core-combat-turn.js";
import { resolveBattleLoopCanonical } from "../runtime/battle-core-battle-loop.js";
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
import { formatSafariBattlePresentationEvent } from "../battle-presentation-narration.js";

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

// Browser-like presentation acceptance: the loop must expose exactly the
// mechanics owner's applied stage resolution, after the move succeeds, without
// recomputing the stage delta in Safari presentation code.
const preparedGrowl = prepareCombatTurnInputCanonical({
  rounds: [{ priorityOrder: [0], actions: [growlAction], attackDecision: 1 }],
});
const growlOperations = resolveBattleLoopCanonical(preparedGrowl).operations.filter((operation) => operation.action === 0);
const useMoveAt = growlOperations.findIndex((operation) => operation.op === "use_move");
const stageAt = growlOperations.findIndex((operation) => operation.op === "stat_stage_change");
assert.ok(useMoveAt >= 0 && stageAt > useMoveAt, "stage presentation operation must follow the owner-approved move");
const stageOperation = growlOperations[stageAt];
assert.deepEqual(
  {
    battlerIndex: stageOperation.battlerIndex,
    stat: stageOperation.stat,
    requestedDelta: stageOperation.requestedDelta,
    appliedDelta: stageOperation.appliedDelta,
    before: stageOperation.before,
    after: stageOperation.after,
  },
  { battlerIndex: 1, stat: "ATTACK", requestedDelta: -1, appliedDelta: -1, before: 0, after: -1 },
  "presentation operation must be the stat-stage owner's applied result",
);
assert.equal(growlOperations.some((operation) => ["calc_damage", "reduce_hp"].includes(operation.op) && Number(operation.damage ?? operation.amount ?? 0) > 0), false, "Growl presentation must remain damage-free");
assert.equal(
  formatSafariBattlePresentationEvent({ type: "stat_stage_changed", actor: "foe", actorSpecies: "RATTATA", stat: stageOperation.stat, appliedDelta: stageOperation.appliedDelta }, {}),
  "RATTATAのこうげきが1段階下がった！",
);
assert.equal(
  formatSafariBattlePresentationEvent({ type: "stat_stage_changed", actor: "player", actorSpecies: "EEVEE", stat: "SPEED", appliedDelta: 2 }, {}),
  "EEVEEのすばやさが2段階上がった！",
);

const safariRoundSource = fs.readFileSync(new URL("../runtime/safari-normal-battle-round.js", import.meta.url), "utf8");
assert.match(safariRoundSource, /operation\.op === "stat_stage_change"/, "Safari normal Battle must consume the owner stat-stage operation");
assert.match(safariRoundSource, /type: "stat_stage_changed"/, "Safari normal Battle must project a short stat-stage presentation event");
assert.doesNotMatch(safariRoundSource, /resolveBattleStatStageChangesCanonical/, "Safari presentation must not parse FunctionCode or reimplement stage mechanics");

console.log("browser direct-normal stat stages smoke: PASS");
