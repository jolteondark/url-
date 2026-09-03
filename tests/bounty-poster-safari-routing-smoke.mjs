import assert from "node:assert/strict";
import { prepareSafariNormalEventV108 } from "../runtime/mapless-normal-event-v108-preparation.js";
import { openSafariBountyPosterTouch, resolveSafariBountyPosterInteraction } from "../runtime/safari-bounty-poster-interaction.js";

function runtimeWith(event) {
  return {
    player:{ party:[] },
    bag:{ slots:[], money:0 },
    variables:{ mapless:{
      day:4,
      board_events:[event],
      board_revealed:[false],
      board_visited:[false],
      board_consumed:[false],
      mapless_bounty:null,
      battle:null,
      shop:null,
      notice:"",
      last_operations:[],
    } },
  };
}

const prepared = prepareSafariNormalEventV108({
  kind:"normal_event",
  normal_event_id:"bounty_poster",
  normal_seed:12345,
  normal_resolved:false,
  normal_data:{},
}, { day:4, index:0 });
assert.equal(prepared.normal_event_id, "bounty_poster");
assert.ok(Number.isInteger(prepared.normal_data.trainer_seed));
assert.ok(prepared.normal_data.type);
assert.ok(prepared.normal_data.appearance);
assert.equal(prepared.normal_data.reward, 2800);

const acceptedRuntime = runtimeWith(prepared);
const ready = openSafariBountyPosterTouch(acceptedRuntime, 0);
assert.equal(ready.result, "bounty_poster_ready");
assert.deepEqual(ready.availableActions, ["accept", "decline"]);
const accepted = resolveSafariBountyPosterInteraction(acceptedRuntime, 0, "accept");
assert.equal(accepted.result, "accepted");
assert.equal(accepted.completed, true);
assert.equal(accepted.persistenceRequested, true);
assert.equal(acceptedRuntime.variables.mapless.board_consumed[0], true);
assert.equal(acceptedRuntime.variables.mapless.mapless_bounty.target_id, prepared.normal_data.trainer_seed);
assert.ok(accepted.operations.some((operation) => operation.op === "set_bounty"));
assert.ok(accepted.operations.some((operation) => operation.op === "request_save"));

const declinedRuntime = runtimeWith(structuredClone(prepared));
const declined = resolveSafariBountyPosterInteraction(declinedRuntime, 0, "decline");
assert.equal(declined.result, "declined");
assert.equal(declinedRuntime.variables.mapless.mapless_bounty, null);
assert.equal(declinedRuntime.variables.mapless.board_consumed[0], true);
assert.ok(declined.operations.some((operation) => operation.op === "request_save"));

const existingRuntime = runtimeWith(structuredClone(prepared));
existingRuntime.variables.mapless.mapless_bounty = { seed:999, accepted_day:3 };
const existing = resolveSafariBountyPosterInteraction(existingRuntime, 0, "accept");
assert.equal(existing.result, "already_active");
assert.equal(existingRuntime.variables.mapless.mapless_bounty.seed, 999);
assert.equal(existingRuntime.variables.mapless.board_consumed[0], true);
assert.ok(existing.operations.some((operation) => operation.op === "bounty_already_active"));

console.log("bounty poster Safari routing smoke: ok");
