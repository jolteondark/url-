import assert from "node:assert/strict";
import { openSafariBerryContestTouch } from "../runtime/safari-berry-contest-touch.js";
import { resolveSafariBerryContestInteraction } from "../runtime/safari-berry-contest-interaction.js";
import { canonicalBerryGrade, canonicalBerryRewardPool } from "../runtime/mapless-v108-berry-catalog.js";

function runtimeFor(event, slots) {
  return {
    variables:{ mapless:{
      day:1,
      board_events:[event],
      board_revealed:[false],
      board_visited:[false],
      board_consumed:[false],
      preview_encounter_seed:0x12345678,
      preview_encounter_counter:0,
    } },
    bag:{ slots:structuredClone(slots), money:0 },
    player:{ party:[] },
  };
}

const event = {
  kind:"normal_event",
  normal_event_id:"berry_contest",
  normal_seed:12345,
  normal_resolved:false,
  normal_data:{ rating_roll:60, bulk_roll:50 },
};

assert.equal(canonicalBerryGrade("ORANBERRY"), 0);
assert.equal(canonicalBerryGrade("LIECHIBERRY"), 3);
assert.ok(canonicalBerryRewardPool(0, "ORANBERRY").every((id) => id !== "ORANBERRY"));

{
  const runtime = runtimeFor(event, [["ORANBERRY",1]]);
  const opened = openSafariBerryContestTouch(runtime, 0);
  assert.equal(opened.result, "berry_contest_ready");
  assert.ok(opened.availableActions.includes("single:ORANBERRY"));
  assert.ok(opened.availableActions.includes("watch"));
  assert.ok(!opened.availableActions.includes("bulk"));

  const resolved = resolveSafariBerryContestInteraction(runtime, 0, "single:ORANBERRY");
  assert.equal(resolved.result, "placed");
  assert.equal(resolved.completed, true);
  assert.equal(runtime.variables.mapless.board_consumed[0], true);
  assert.equal(runtime.variables.mapless.board_events[0].normal_resolved, true);
  assert.ok(runtime.variables.mapless.last_operations.some((operation) => operation.op === "request_save"));
  assert.ok(runtime.variables.mapless.last_operations.some((operation) => operation.op === "runtime_remove_item" && operation.item === "ORANBERRY"));
  assert.ok(runtime.variables.mapless.last_operations.some((operation) => operation.op === "runtime_grant_item"));
}

{
  const runtime = runtimeFor(event, [["ORANBERRY",3]]);
  const opened = openSafariBerryContestTouch(runtime, 0);
  assert.ok(opened.availableActions.includes("bulk"));
  const resolved = resolveSafariBerryContestInteraction(runtime, 0, "bulk");
  assert.equal(resolved.result, "bulk");
  assert.equal(resolved.completed, true);
  const removed = runtime.variables.mapless.last_operations
    .filter((operation) => operation.op === "runtime_remove_item")
    .reduce((sum, operation) => sum + Number(operation.quantity), 0);
  assert.equal(removed, 3);
  assert.ok(runtime.variables.mapless.last_operations.some((operation) => operation.op === "request_save"));
}

{
  const runtime = runtimeFor(event, []);
  const resolved = resolveSafariBerryContestInteraction(runtime, 0, "watch");
  assert.equal(resolved.result, "watched");
  assert.equal(resolved.completed, true);
  assert.equal(runtime.variables.mapless.board_consumed[0], true);
  assert.ok(runtime.bag.slots.some((slot) => Array.isArray(slot) && /BERRY$/.test(String(slot[0]))));
}

console.log("berry contest playable convergence smoke: ok");
