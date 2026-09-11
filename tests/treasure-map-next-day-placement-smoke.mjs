import assert from "node:assert/strict";
import { materializeTreasureMapForDayV108 } from "../runtime/mapless-treasure-map-board-placement-v108.js";

function runtimeFor(day, map) {
  return {
    variables: {
      mapless: {
        day,
        preview_encounter_seed: 123456789,
        preview_encounter_counter: 0,
        mapless_treasure_map: structuredClone(map),
        board_events: [
          { kind:"next_day" },
          { kind:"wild" },
          { kind:"trainer" },
          { kind:"empty" },
          { kind:"center" },
        ],
        board_revealed: [true, false, false, false, false],
      },
    },
  };
}

const scheduledMap = { fake:true, purchase_day:1, due_day:2, price:1200, seed:77, placed_day:null };
const runtime = runtimeFor(2, scheduledMap);
const placed = materializeTreasureMapForDayV108(runtime);
assert.equal(placed.placed, true);
assert.equal(placed.expired, false);
assert.equal(runtime.variables.mapless.board_events[placed.index].normal_event_id, "treasure_map_result");
assert.equal(runtime.variables.mapless.board_events[placed.index].normal_data.fake, true);
assert.equal(runtime.variables.mapless.board_events[placed.index].normal_data.price, 1200);
assert.equal(runtime.variables.mapless.board_events[placed.index].normal_data.seed, 77);
assert.equal(runtime.variables.mapless.board_revealed[placed.index], true);
assert.equal(runtime.variables.mapless.mapless_treasure_map.placed_day, 2);
assert.equal(placed.operations.filter((operation) => operation.op === "request_save").length, 1);

const replay = materializeTreasureMapForDayV108(runtime);
assert.equal(replay.placed, false);
assert.equal(replay.expired, false);
assert.deepEqual(replay.operations, []);
assert.equal(runtime.variables.mapless.mapless_treasure_map.placed_day, 2);

runtime.variables.mapless.day = 3;
const expiredPlaced = materializeTreasureMapForDayV108(runtime);
assert.equal(expiredPlaced.expired, true);
assert.equal(runtime.variables.mapless.mapless_treasure_map, null);
assert.equal(expiredPlaced.operations.filter((operation) => operation.op === "request_save").length, 1);

const missedRuntime = runtimeFor(3, scheduledMap);
const expiredDue = materializeTreasureMapForDayV108(missedRuntime);
assert.equal(expiredDue.expired, true);
assert.equal(missedRuntime.variables.mapless.mapless_treasure_map, null);
assert.equal(expiredDue.operations.some((operation) => operation.op === "clear_treasure_map" && operation.reason === "missed_due_day"), true);

const earlyRuntime = runtimeFor(1, scheduledMap);
const early = materializeTreasureMapForDayV108(earlyRuntime);
assert.equal(early.placed, false);
assert.equal(early.expired, false);
assert.deepEqual(early.operations, []);

console.log("treasure map next-day placement smoke: ok");
