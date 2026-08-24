import assert from "node:assert/strict";
import { minimumExpForLevel } from "../runtime/pokemon-growth-rate.js";
import { resolvePokemonRuntimeMasters } from "../runtime/pokemon-runtime-masters.js";
import {
  grantSafariNormalEventPartyExp,
  grantSafariNormalEventPokemonExp,
} from "../runtime/safari-normal-event-exp-owner.js";
import {
  SAFARI_MOVE_MASTERS,
  SAFARI_SPECIES_MASTERS,
} from "../runtime/safari-playable-data.js";

const zeroStats = { HP:0, ATTACK:0, DEFENSE:0, SPECIAL_ATTACK:0, SPECIAL_DEFENSE:0, SPEED:0 };
const source = {
  id:"EVENTEXPTEST",
  name:"Event EXP Test",
  types:["NORMAL"],
  growth_rate:"Medium",
  base_exp:60,
  catch_rate:255,
  base_stats:{ HP:40, ATTACK:40, DEFENSE:40, SPECIAL_ATTACK:40, SPECIAL_DEFENSE:40, SPEED:40 },
  level_moves:[{ level:11, move:"EVENTMOVE1" }, { level:12, move:"EVENTMOVE2" }],
  evolutions:[{ species:"EVENTEXPTEST2", method:"Level", parameter:12 }],
};
const evolved = {
  id:"EVENTEXPTEST2",
  name:"Event EXP Test 2",
  types:["NORMAL"],
  growth_rate:"Medium",
  base_exp:100,
  catch_rate:255,
  base_stats:{ HP:65, ATTACK:60, DEFENSE:60, SPECIAL_ATTACK:60, SPECIAL_DEFENSE:60, SPEED:60 },
  level_moves:[],
  evolutions:[],
};
Object.assign(SAFARI_SPECIES_MASTERS, { EVENTEXPTEST:source, EVENTEXPTEST2:evolved });
Object.assign(SAFARI_MOVE_MASTERS, {
  EVENTMOVE1:{ id:"EVENTMOVE1", name:"Event Move 1", category:"Status", power:0, accuracy:100, total_pp:10, priority:0, type:"NORMAL", thaws_user:false },
  EVENTMOVE2:{ id:"EVENTMOVE2", name:"Event Move 2", category:"Status", power:0, accuracy:100, total_pp:11, priority:0, type:"NORMAL", thaws_user:false },
});

function pokemon({ egg=false }={}) {
  const runtime = resolvePokemonRuntimeMasters({
    species:"EVENTEXPTEST",
    level:10,
    exp:minimumExpForLevel("Medium", 10),
    personal_id:egg ? 222 : 111,
    gender:0,
    form:0,
    hp:20,
    status:"NONE",
    status_count:0,
    item:null,
    ability_id:null,
    ability_index:0,
    nature_id:"HARDY",
    iv:zeroStats,
    ev:zeroStats,
    moves:[{ id:"TACKLE", pp:7, ppup:0 }],
  }, {
    species_master:source,
    nature_master:{ id:"HARDY", stat_changes:[] },
    move_masters:SAFARI_MOVE_MASTERS,
  });
  runtime.hp = 20;
  if (egg) {
    runtime.egg = true;
    runtime.steps_to_hatch = 100;
  }
  return runtime;
}

{
  const runtime = { player:{ party:[pokemon()] } };
  const beforeExp = runtime.player.party[0].exp;
  const result = await grantSafariNormalEventPokemonExp(runtime, 0, 35);
  assert.equal(result.expGained, 35, "targeted normal-event EXP must preserve the exact canonical amount");
  assert.equal(runtime.player.party[0].exp, beforeExp + 35);
  assert.equal(result.skipped, false);
}

{
  const regular = pokemon();
  const egg = pokemon({ egg:true });
  const runtime = { player:{ party:[regular, egg] } };
  const eggBefore = structuredClone(egg);
  const amount = minimumExpForLevel("Medium", 12) - minimumExpForLevel("Medium", 10);
  const result = await grantSafariNormalEventPartyExp(runtime, amount);

  assert.deepEqual(result.recipients, [{ partyIndex:0, expGained:amount }], "Party EXP must skip eggs and grant each eligible party member exactly once");
  assert.equal(runtime.player.party[0].level, 12, "shared event EXP must reuse canonical level growth");
  assert.equal(runtime.player.party[0].species, "EVENTEXPTEST2", "shared event EXP must reuse canonical Level evolution");
  assert.deepEqual(runtime.player.party[0].moves.map((move) => move.id), ["TACKLE", "EVENTMOVE1", "EVENTMOVE2"], "shared event EXP must reuse canonical level-move learning");
  assert.equal(runtime.player.party[0].moves[0].pp, 7, "untouched PP must not refill during event EXP growth");
  assert.equal(runtime.player.party[0].personal_id, 111, "event EXP growth must preserve individual identity");
  assert.deepEqual(runtime.player.party[1], eggBefore, "eggs must not receive normal-event Party EXP");
  assert.ok(result.operations.some((operation) => operation.op === "gain_exp" && operation.partyIndex === 0));
  assert.ok(result.operations.some((operation) => operation.op === "level_up" && operation.level === 12));
  assert.ok(result.operations.some((operation) => operation.op === "level_evolution" && operation.to === "EVENTEXPTEST2"));
}

console.log("Safari shared normal-event EXP owner smoke passed");
