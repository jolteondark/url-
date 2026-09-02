import assert from "node:assert/strict";
import { placeSafariBountyTargetForDayV108 } from "../runtime/mapless-bounty-target-board-placement-v108.js";

function runtime(day, bounty) {
  return {
    variables:{ mapless:{
      day,
      mapless_bounty:structuredClone(bounty),
      preview_encounter_seed:0x12345678,
      preview_encounter_counter:0,
      board_events:[
        {kind:"next_day",slot:0},
        {kind:"wild",slot:1},
        {kind:"trainer",slot:2},
        {kind:"house",slot:3},
        {kind:"tavern",slot:4},
        {kind:"treasure",slot:5},
        {kind:"center",slot:6},
        {kind:"trap",slot:7},
      ],
      board_revealed:Array(8).fill(false),
      board_consumed:Array(8).fill(false),
      board_visited:Array(8).fill(false),
    } },
    player:{party:[]},
    bag:{slots:[],money:0},
  };
}

const bounty = {
  accepted_day:1,
  target_id:123,
  type:"DARK",
  reward:2050,
  seed:123,
  placed_day:null,
};

{
  const current = runtime(1, bounty);
  const result = placeSafariBountyTargetForDayV108(current);
  assert.equal(result.placed, false);
  assert.equal(result.operations.length, 0);
  assert.equal(current.variables.mapless.mapless_bounty.placed_day, null);
}

{
  const current = runtime(2, bounty);
  const result = placeSafariBountyTargetForDayV108(current);
  assert.equal(result.placed, false, "Ruby Random.new(seed ^ day*1_000_003).rand(100)=27 must miss the canonical 25% day-2 chance");
  assert.deepEqual(result.operations[0], {
    op:"bounty_target_placement_roll",
    seed:2000125,
    value:27,
    chance:25,
    elapsed_days:1,
  });
}

{
  const current = runtime(4, bounty);
  const result = placeSafariBountyTargetForDayV108(current);
  assert.equal(result.placed, true, "three elapsed days must use the canonical guaranteed placement");
  assert.equal(result.index, 7, "preferred replaceable slots must win before facility/normal-event fallback slots");
  const event = current.variables.mapless.board_events[7];
  assert.equal(event.kind, "normal_event");
  assert.equal(event.normal_event_id, "bounty_target");
  assert.equal(event.normal_data.type, "DARK");
  assert.equal(event.normal_data.reward, 2050);
  assert.equal(event.normal_data.seed, 123);
  assert.equal(current.variables.mapless.board_revealed[7], true);
  assert.equal(current.variables.mapless.mapless_bounty.placed_day, 4);
  assert.ok(result.operations.some((operation) => operation.op === "request_save"));
  assert.equal(current.variables.mapless.board_events.filter((entry) => entry.kind === "wild").length, 1);
  assert.equal(current.variables.mapless.board_events.filter((entry) => entry.kind === "trainer").length, 1);
  assert.equal(current.variables.mapless.board_events.filter((entry) => entry.kind === "next_day").length, 1);
}

{
  const missed = {...bounty, placed_day:3};
  const current = runtime(4, missed);
  const result = placeSafariBountyTargetForDayV108(current);
  assert.equal(result.expired, true);
  assert.equal(current.variables.mapless.mapless_bounty, null);
  assert.ok(result.operations.some((operation) => operation.op === "clear_bounty"));
  assert.ok(result.operations.some((operation) => operation.op === "request_save"));
}

console.log("bounty target Board placement v0.9.108 smoke: ok");
