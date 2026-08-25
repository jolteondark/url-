import assert from "node:assert/strict";
import {
  resolveSafariLostBagInteraction,
  safariLostBagWarning,
} from "../runtime/safari-lost-bag-interaction.js";

function runtimeFor({ trap=false, waitRoll=90, types=[] } = {}) {
  return {
    player:{ party:[{ species:"EEVEE", hp:20, egg:false, types }] },
    variables:{ mapless:{
      day:1,
      location:"day_board",
      board_events:[{ kind:"normal_event", normal_event_id:"lost_bag", normal_seed:12345, normal_data:{ trap, wait_roll:waitRoll } }],
      board_revealed:[false],
      board_visited:[false],
      board_consumed:[false],
      battle:null,
      shop:null,
      preview_encounter_seed:777,
      preview_encounter_counter:0,
      last_operations:[],
      notice:"",
    } },
    bag:{ slots:[], money:0 },
  };
}

{
  const runtime = runtimeFor();
  const result = await resolveSafariLostBagInteraction(runtime, 0, "open");
  assert.equal(result.result, "safe_open_reward");
  assert.equal(result.completed, true);
  assert.equal(runtime.variables.mapless.board_consumed[0], true);
  assert.equal(result.reward.selectedItems.length, 2);
  assert.equal(runtime.variables.mapless.preview_encounter_counter, 0, "safe open must use event-local RNG, not shared run RNG");
  assert.equal(runtime.bag.slots.reduce((sum, slot) => sum + Number(slot?.[1] ?? 0), 0), 2);
}

{
  const runtime = runtimeFor({ waitRoll:20 });
  const result = await resolveSafariLostBagInteraction(runtime, 0, "wait");
  assert.equal(result.result, "owner_returned");
  assert.equal(result.completed, true);
  assert.equal(runtime.bag.money, 500);
  assert.equal(result.reward.selectedItems.length, 1);
  assert.ok(runtime.variables.mapless.preview_encounter_counter > 0, "wait reward must borrow shared run RNG");
}

{
  const runtime = runtimeFor({ waitRoll:90 });
  const result = await resolveSafariLostBagInteraction(runtime, 0, "wait");
  assert.equal(result.result, "owner_never_returned");
  assert.equal(result.reward, null);
  assert.equal(runtime.bag.money, 0);
  assert.equal(runtime.variables.mapless.preview_encounter_counter, 0, "no-reward wait must consume no shared run RNG");
}

{
  const runtime = runtimeFor();
  const result = await resolveSafariLostBagInteraction(runtime, 0, "leave");
  assert.equal(result.result, "left");
  assert.equal(result.completed, true);
  assert.equal(runtime.variables.mapless.board_consumed[0], true);
}

{
  const runtime = runtimeFor({ trap:true, types:["DARK"] });
  assert.equal(safariLostBagWarning(runtime, 0), true);
  const result = await resolveSafariLostBagInteraction(runtime, 0, "wait");
  assert.equal(result.result, "extra_pokemon_trainer_owner_required");
  assert.equal(result.blockedBy, "#846");
  assert.equal(result.completed, false);
  assert.equal(runtime.variables.mapless.board_consumed[0], false, "blocked trapped wait must not consume the event");
  assert.equal(runtime.variables.mapless.preview_encounter_counter, 0, "blocked trapped wait must consume no RNG");
}

{
  const runtime = runtimeFor({ trap:true });
  runtime.bag.slots = Array.from({ length:20 }, (_, index) => [`FULL${index}`, 99]);
  const result = await resolveSafariLostBagInteraction(runtime, 0, "open");
  assert.equal(result.result, "reward_bag_full");
  assert.equal(result.completed, false);
  assert.equal(runtime.variables.mapless.battle, null, "trapped open must not start a Battle that cannot pay its possible win reward");
  assert.equal(runtime.variables.mapless.board_consumed[0], false);
}

console.log("Safari Lost Bag interaction smoke passed");
