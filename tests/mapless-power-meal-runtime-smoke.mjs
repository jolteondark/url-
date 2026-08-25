import assert from "node:assert/strict";
import {
  clearExpiredSafariPowerMeal,
  consumeSafariPowerMealAfterBattle,
  ensureSafariPowerMealBattleOpening,
  setSafariPowerMeal,
} from "../runtime/mapless-power-meal-runtime.js";

function runtime(day = 7) {
  return {
    variables:{ mapless:{ day, mapless_power_meal_battles:0, mapless_power_meal_day:day, last_operations:[] } },
  };
}

const run = runtime();
assert.deepEqual(setSafariPowerMeal(run, 3), { battles:3, day:7 });
run.variables.mapless.battle = { completed:false, last_operations:[] };
const opening = ensureSafariPowerMealBattleOpening(run);
assert.equal(opening.active, true);
assert.equal(opening.applied, true);
assert.equal(run.variables.mapless.battle.stat_stages[0].ATTACK, 1);
assert.equal(run.variables.mapless.battle.stat_stages[0].SPECIAL_ATTACK, 1);
assert.equal(run.variables.mapless.battle.stat_stages[1].ATTACK, 0);
assert.equal(run.variables.mapless.mapless_power_meal_battles, 3,
  "opening must not consume a battle before RESULT");
ensureSafariPowerMealBattleOpening(run);
assert.equal(run.variables.mapless.battle.stat_stages[0].ATTACK, 1,
  "opening boost must apply once per battle");
run.variables.mapless.battle.completed = true;
assert.equal(consumeSafariPowerMealAfterBattle(run).remaining, 2);
assert.equal(consumeSafariPowerMealAfterBattle(run).remaining, 2,
  "RESULT replay must not consume the meal twice");

const continued = structuredClone(run);
continued.variables.mapless.battle = { completed:false, last_operations:[] };
ensureSafariPowerMealBattleOpening(continued);
assert.equal(continued.variables.mapless.battle.stat_stages[0].ATTACK, 1,
  "Save/Continue state must preserve remaining power-meal battles");
continued.variables.mapless.day = 8;
continued.variables.mapless.battle = null;
assert.equal(clearExpiredSafariPowerMeal(continued), 0,
  "power meal must expire when the run advances to another day");
assert.equal(continued.variables.mapless.mapless_power_meal_day, 8);

const prototype = runtime(3);
setSafariPowerMeal(prototype, 1);
prototype.variables.mapless.battle = { completed:false, last_operations:[] };
ensureSafariPowerMealBattleOpening(prototype);
prototype.variables.mapless.battle.completed = true;
assert.equal(consumeSafariPowerMealAfterBattle(prototype).remaining, 0,
  "prototype power meal must last exactly one battle");

console.log("Mapless power meal battle owner smoke passed");
