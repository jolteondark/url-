import assert from "node:assert/strict";
import { SAFARI_MOVE_MASTERS } from "../runtime/safari-playable-data.js";
import { safariGeneralMoveEffectChanceV108 } from "../runtime/safari-general-move-effect-chance-facts.js";
import { safariGeneralSecondaryFunctionCodeV108 } from "../runtime/safari-general-move-secondary-function-facts.js";
import { BATTLE_CONFUSION_TURNS_FIELD } from "../runtime/battle-browser-confusion-transient.js";
import { resolveBrowserBattleRound } from "../runtime/browser-battle-round-runtime.js";

const dynamicPunchFunction = safariGeneralSecondaryFunctionCodeV108("DYNAMICPUNCH");
const dynamicPunchChance = safariGeneralMoveEffectChanceV108("DYNAMICPUNCH");
const hurricaneFunction = safariGeneralSecondaryFunctionCodeV108("HURRICANE");
const psybeamFunction = safariGeneralSecondaryFunctionCodeV108("PSYBEAM");
assert.equal(dynamicPunchFunction, "ConfuseTarget");
assert.equal(dynamicPunchChance, 100);
assert.equal(hurricaneFunction, "ConfuseTargetAlwaysHitsInRainHitsTargetInSky");
assert.equal(psybeamFunction, "ConfuseTarget");

SAFARI_MOVE_MASTERS.DYNAMICPUNCH = Object.freeze({
  id:"DYNAMICPUNCH", name:"Dynamic Punch", category:"Physical", power:100, accuracy:50,
  total_pp:5, priority:0, type:"FIGHTING", thaws_user:false,
  function_code:dynamicPunchFunction, effect_chance:dynamicPunchChance,
});
SAFARI_MOVE_MASTERS.TACKLE = Object.freeze({
  id:"TACKLE", name:"Tackle", category:"Physical", power:40, accuracy:100,
  total_pp:35, priority:0, type:"NORMAL", thaws_user:false,
  function_code:"None", effect_chance:0,
});

function pokemon({ species, move, speed, hp = 500, attack = 50, defense = 100 } = {}) {
  return {
    species, level:20, hp, max_hp:hp, status:"NONE", status_count:0,
    ability_id:"NONE", item:null, types:["NORMAL"],
    stats:{ ATTACK:attack, DEFENSE:defense, SPECIAL_ATTACK:50, SPECIAL_DEFENSE:100, SPEED:speed },
    moves:[{ id:move, pp:20, ppup:0 }],
  };
}

const firstPlayer = pokemon({ species:"EEVEE", move:"DYNAMICPUNCH", speed:100 });
const firstFoe = pokemon({ species:"RATTATA", move:"TACKLE", speed:20 });
const first = resolveBrowserBattleRound({
  player:firstPlayer,
  foe:firstFoe,
  playerParty:[firstPlayer],
  foeParty:[firstFoe],
  selectedMoveId:"DYNAMICPUNCH",
  foeMoveId:"TACKLE",
  moveMasters:SAFARI_MOVE_MASTERS,
  combatRandomSeed:357,
  priorityRandomSeed:9,
  playerRandomRoll:0,
  foeRandomRoll:0,
  foeConfusionRandomRoll:100,
});
assert.equal(first.decision, 0, "confusion smoke must stay in an active battle");
const firstRound = first.battleRuntimeIntegration.combatTrace.rounds[0];
const source = firstRound.actions.find((action) => Number(action.battlerIndex) === 0);
const target = firstRound.actions.find((action) => Number(action.battlerIndex) === 1);
assert.equal(source.transientConfusionEffectResolution.applied, true);
assert.equal(source.transientConfusionEffectResolution.targetHadActed, false);
assert.ok(source.transientConfusionEffectResolution.turns >= 2 && source.transientConfusionEffectResolution.turns <= 5);
assert.equal(target.useMoveInput.tryUseMoveInput.confusionTurns, source.transientConfusionEffectResolution.turns);
assert.equal(target.tryUseMoveResolution.confusionTurns, source.transientConfusionEffectResolution.turns - 1);
assert.equal(first.foe[BATTLE_CONFUSION_TURNS_FIELD], source.transientConfusionEffectResolution.turns - 1);
assert.ok(first.operations.some((operation) => operation.op === "display_confused" && operation.actor === "foe"));

const second = resolveBrowserBattleRound({
  player:first.player,
  foe:first.foe,
  playerParty:first.battleContinuationHandoff.playerParty,
  foeParty:first.battleContinuationHandoff.foeParty,
  selectedMoveId:"DYNAMICPUNCH",
  foeMoveId:"TACKLE",
  moveMasters:SAFARI_MOVE_MASTERS,
  combatRandomSeed:358,
  priorityRandomSeed:9,
  playerRandomRoll:0,
  foeRandomRoll:0,
  foeConfusionRandomRoll:100,
});
assert.equal(second.decision, 0);
const secondRound = second.battleRuntimeIntegration.combatTrace.rounds[0];
const secondSource = secondRound.actions.find((action) => Number(action.battlerIndex) === 0);
const secondTarget = secondRound.actions.find((action) => Number(action.battlerIndex) === 1);
assert.equal(secondSource.transientConfusionEffectResolution.applied, false, "a target already confused at hit time must not be reset");
assert.equal(secondSource.transientConfusionEffectResolution.reason, "already_confused");
assert.equal(secondTarget.useMoveInput.tryUseMoveInput.confusionTurns, first.foe[BATTLE_CONFUSION_TURNS_FIELD]);
assert.equal(second.confusionTurns.foe, Math.max(0, first.confusionTurns.foe - 1));
if (second.confusionTurns.foe > 0) {
  assert.equal(second.foe[BATTLE_CONFUSION_TURNS_FIELD], second.confusionTurns.foe);
} else {
  assert.equal(Object.hasOwn(second.foe, BATTLE_CONFUSION_TURNS_FIELD), false);
}

console.log("damaging confusion secondary browser Battle smoke: ok");
