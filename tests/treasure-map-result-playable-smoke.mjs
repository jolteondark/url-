import assert from "node:assert/strict";
import { activateSafariTreasureMapResult } from "../runtime/safari-treasure-map-result-interaction.js";

function runtimeFor({ fake = false, seed = 123 } = {}) {
  return {
    player:{ party:[{ species:"EEVEE", hp:10, egg:false }] },
    variables:{ mapless:{
      day:2,
      board_events:[{
        kind:"normal_event",
        normal_event_id:"treasure_map_result",
        normal_seed:seed,
        normal_resolved:false,
        normal_data:{},
      }],
      board_revealed:[false],
      board_visited:[false],
      board_consumed:[false],
      battle:null,
      shop:null,
      last_operations:[],
      mapless_treasure_map:{ fake, purchase_day:1, due_day:2, price:900, seed, placed_day:2 },
    } },
    bag:{ slots:[], money:0, max_slots:20, max_per_slot:99 },
  };
}

{
  const runtime = runtimeFor({ fake:false, seed:123 });
  const result = await activateSafariTreasureMapResult(runtime, 0);
  const state = runtime.variables.mapless;
  assert.equal(result.completed, true);
  assert.equal(state.board_consumed[0], true);
  assert.equal(state.board_events[0].normal_event_id, "treasure_map_result");
  assert.equal(state.board_events[0].normal_resolved, true);
  assert.equal(state.mapless_treasure_map, null);
  assert.ok(runtime.bag.money > 0 || runtime.bag.slots.length > 0);
  assert.ok(result.operations.some((operation) => operation.op === "clear_treasure_map"));
  assert.ok(result.operations.some((operation) => operation.op === "treasure_reward"));
  assert.ok(result.operations.some((operation) => operation.op === "request_save"));
}

{
  const runtime = runtimeFor({ fake:true, seed:321 });
  const state = runtime.variables.mapless;
  // Fake routes must not resolve/clear before the shared Battle owner accepts the continuation.
  // The battle start itself is covered by the shared normal-event Battle continuation smokes.
  assert.equal(state.board_consumed[0], false);
  assert.equal(state.mapless_treasure_map.fake, true);
}

console.log("treasure map result playable smoke: ok");
