import assert from "node:assert/strict";
import { resolveSleepingGiant } from "../runtime/mapless-normal-events-a2-flow.js";
import { resolveSafariSleepingGiantInteraction } from "../runtime/safari-sleeping-giant-interaction.js";
import { openSafariNormalEventTouch, supportsSafariNormalEventTouch } from "../runtime/safari-normal-event-touch-handoff.js";

function runtime(event, slots=[]) {
  return {
    player:{ party:[{ species:"TESTMON", hp:20, egg:false }] },
    bag:{ slots:structuredClone(slots), money:0 },
    variables:{ mapless:{
      day:4, location:"day_board", board_events:[structuredClone(event)],
      board_revealed:[false], board_visited:[false], board_consumed:[false],
      battle:null, shop:null, last_operations:[], notice:"",
    } },
  };
}
function giant({ stealRoll=10 }={}) {
  return { kind:"normal_event", normal_event_id:"sleeping_giant", normal_seed:1234, normal_resolved:false,
    normal_data:{ type:"NORMAL", display_item:"NUGGET", boost_stat:"ATTACK", steal_roll:stealRoll } };
}

assert.equal(supportsSafariNormalEventTouch("sleeping_giant"), true);
{
  const current = runtime(giant());
  const ready = openSafariNormalEventTouch(current, 0);
  assert.deepEqual(ready.availableActions, ["steal","fight","leave"]);
  assert.match(ready.normalEventUi.message, /NUGGET/);
  const result = await resolveSafariSleepingGiantInteraction(current, 0, "steal");
  assert.equal(result.result, "steal_success");
  assert.equal(current.variables.mapless.board_consumed[0], true);
  assert.deepEqual(current.bag.slots, [["NUGGET",1]]);
  assert.equal(resolveSleepingGiant({ event:giant(), action:"steal" }).outcome, "steal_success");
}
{
  const full = Array.from({length:20}, (_,i) => [`ITEM${i}`,99]);
  const current = runtime(giant(), full);
  const result = await resolveSafariSleepingGiantInteraction(current, 0, "steal");
  assert.equal(result.result, "reward_bag_full");
  assert.equal(current.variables.mapless.board_consumed[0], false);
  assert.deepEqual(current.bag.slots, full);
}
{
  const preview = resolveSleepingGiant({ event:giant({stealRoll:99}), action:"fight", battle_success:false });
  const request = preview.operations.find((operation) => operation.op === "start_wild_battle");
  assert.equal(request.modifier, 3);
  assert.deepEqual(request.enemy_stages, { ATTACK:1 });
}
console.log("Safari Sleeping Giant playable smoke passed");
