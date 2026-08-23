import assert from "node:assert/strict";

import { resolveSleepingGiant } from "../runtime/mapless-normal-events-a2-flow.js";
import { resolveBerryThief } from "../runtime/mapless-normal-events-a3-flow.js";
import { safariWildBattleInitialStatStages } from "../runtime/safari-web-combat-start.js";

function battleOperation(result) {
  return (result.operations ?? []).find((operation) => operation?.op === "start_wild_battle") ?? null;
}

{
  const result = resolveSleepingGiant({
    event: {
      kind:"normal_event",
      normal_event_id:"sleeping_giant",
      normal_seed:17,
      normal_data:{ type:"NORMAL", boost_stat:"ATTACK", display_item:"POTION", steal_roll:80 },
    },
    action:"fight",
    battle_success:false,
  });
  const battle = battleOperation(result);
  assert.ok(battle, "Sleeping Giant fight must emit the canonical wild Battle operation");
  assert.equal(battle.modifier, 3);
  assert.deepEqual(battle.enemy_stages, { ATTACK:1 });

  const stages = safariWildBattleInitialStatStages(battle);
  assert.equal(stages[0].ATTACK, 0, "canonical event stage boost must never leak to the player battler");
  assert.equal(stages[1].ATTACK, 1, "Sleeping Giant ATTACK +1 must seed the existing foe stat-stage owner");
  assert.equal(stages[1].SPEED, 0);
}

{
  const result = resolveBerryThief({
    event: {
      kind:"normal_event",
      normal_event_id:"berry_thief",
      normal_seed:23,
      normal_data:{ type:"BUG", stolen:[], stolen_applied:true, thief_roll:50 },
    },
    action:"chase",
    battle_success:false,
  });
  const battle = battleOperation(result);
  assert.ok(battle, "Berry Thief chase must emit the canonical wild Battle operation");
  assert.equal(battle.modifier, 0);
  assert.deepEqual(battle.enemy_stages, { SPEED:1 });

  const stages = safariWildBattleInitialStatStages(battle);
  assert.equal(stages[1].SPEED, 1, "Berry Thief SPEED +1 must seed the existing foe stat-stage owner");
  assert.equal(stages[1].ATTACK, 0);
}

{
  const neutral = safariWildBattleInitialStatStages({ op:"start_wild_battle", type:"BUG", modifier:1, seed:4 });
  assert.equal(neutral[0].ATTACK, 0);
  assert.equal(neutral[0].SPEED, 0);
  assert.equal(neutral[1].ATTACK, 0);
  assert.equal(neutral[1].SPEED, 0, "wild Battles without canonical enemy_stages must preserve the neutral-stage contract");
}

console.log("Safari normal-event wild enemy_stages shared handoff: PASS");
