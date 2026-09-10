import assert from "node:assert/strict";
import { resolveSafariTreasureMapSellerInteraction } from "../runtime/safari-treasure-map-interaction.js";

function runtimeFor(event, money = 1000) {
  return {
    player:{ party:[{ species:"EEVEE", hp:10, egg:false }] },
    variables:{ mapless:{
      day:1,
      board_events:[event],
      board_revealed:[false],
      board_visited:[false],
      board_consumed:[false],
      battle:null,
      shop:null,
      last_operations:[],
    } },
    bag:{ slots:[], money },
  };
}

const event = {
  kind:"normal_event",
  normal_event_id:"treasure_map_seller",
  normal_seed:123,
  normal_resolved:false,
  normal_data:{ fake:false },
};

{
  const runtime = runtimeFor(structuredClone(event), 1000);
  const result = resolveSafariTreasureMapSellerInteraction(runtime, 0, "buy");
  assert.equal(result.completed, true);
  assert.equal(runtime.bag.money, 100);
  assert.equal(runtime.variables.mapless.board_consumed[0], true);
  assert.equal(runtime.variables.mapless.mapless_treasure_map?.purchase_day, 1);
  assert.equal(runtime.variables.mapless.mapless_treasure_map?.due_day, 2);
  assert.equal(runtime.variables.mapless.mapless_treasure_map?.fake, false);
  assert.ok(result.operations.some((operation) => operation.op === "set_treasure_map"));
  assert.ok(result.operations.some((operation) => operation.op === "request_save"));
  assert.equal(result.persistenceRequested, true);
}

{
  const runtime = runtimeFor(structuredClone(event), 899);
  const result = resolveSafariTreasureMapSellerInteraction(runtime, 0, "buy");
  assert.equal(result.completed, false);
  assert.equal(runtime.bag.money, 899);
  assert.equal(runtime.variables.mapless.mapless_treasure_map, undefined);
  assert.equal(runtime.variables.mapless.board_consumed[0], false);
  assert.equal(result.persistenceRequested, false);
}

{
  const runtime = runtimeFor(structuredClone(event), 1000);
  const result = resolveSafariTreasureMapSellerInteraction(runtime, 0, "leave");
  assert.equal(result.completed, true);
  assert.equal(runtime.bag.money, 1000);
  assert.equal(runtime.variables.mapless.board_consumed[0], true);
  assert.equal(runtime.variables.mapless.mapless_treasure_map, undefined);
  assert.ok(result.operations.some((operation) => operation.op === "request_save"));
}

console.log("treasure map seller playable smoke: ok");
