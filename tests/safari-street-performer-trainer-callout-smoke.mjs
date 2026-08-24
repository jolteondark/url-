import assert from "node:assert/strict";

import {
  completeSafariNormalEventBattleContinuation,
  pendingSafariNormalEventBattleContinuation,
} from "../runtime/safari-normal-event-battle-continuation.js";
import { returnSafariToDayBoard } from "../runtime/safari-normal-battle-lifecycle.js";
import { resolveSafariStreetPerformerInteraction } from "../runtime/safari-street-performer-interaction.js";

function runtimeFor() {
  return {
    variables: {
      mapless: {
        day: 7,
        location: "day_board",
        board_events: [{
          kind: "normal_event",
          normal_event_id: "street_performer",
          normal_seed: 12345,
          normal_resolved: false,
          normal_data: { fraud_roll: 12 },
        }],
        board_revealed: [true],
        board_consumed: [false],
        board_visited: [true],
        last_operations: [],
        notice: "",
        battle: null,
        shop: null,
      },
    },
    player: {
      party: [{ species: "PIKACHU", level: 12, hp: 30, max_hp: 30, status: "NONE", moves: ["TACKLE"] }],
    },
    bag: { slots: [], money: 0 },
    storage_system: { boxes: [], currentBox: 0 },
  };
}

{
  const runtime = runtimeFor();
  const started = await resolveSafariStreetPerformerInteraction(runtime, 0, "callout");
  assert.equal(started.result, "normal_event_trainer_battle_started");
  assert.equal(runtime.variables.mapless.board_consumed[0], false, "callout must not consume the event before trainer Battle returns");
  assert.equal(runtime.variables.mapless.battle.kind, "trainer");
  assert.equal(runtime.variables.mapless.battle.origin, "normal_event");
  assert.equal(pendingSafariNormalEventBattleContinuation(runtime).action_id, "callout");

  // The continuation checkpoint is persistence-safe plain state. Simulate a reload
  // between Battle start and RESULT before returning to the Day Board.
  const reloaded = structuredClone(runtime);
  globalThis.__maplessSafariRuntime = reloaded;
  reloaded.variables.mapless.battle.completed = true;
  reloaded.variables.mapless.battle.decision = 1;
  reloaded.variables.mapless.battle.return_target = "day_board";
  const returned = returnSafariToDayBoard(reloaded);
  assert.equal(returned.target, "day_board");
  assert.equal(returned.normalEventContinuation.result, "fraud_battle");
  assert.equal(reloaded.variables.mapless.board_consumed[0], true);
  assert.equal(reloaded.variables.mapless.board_events[0].normal_resolved, true);
  assert.ok(returned.operations.some((operation) => operation.op === "request_save" && operation.reason === "normal_event_post_trainer_battle"));

  const beforeReplay = structuredClone(reloaded.variables.mapless.last_operations);
  const replay = completeSafariNormalEventBattleContinuation(reloaded, {
    target: "day_board",
    summary: { decision: 1 },
  });
  assert.equal(replay.result, "fraud_battle");
  assert.deepEqual(reloaded.variables.mapless.last_operations, beforeReplay, "committed callout continuation must replay without duplicate event work");
}

{
  const runtime = runtimeFor();
  const started = await resolveSafariStreetPerformerInteraction(runtime, 0, "callout");
  assert.equal(started.result, "normal_event_trainer_battle_started");
  const ended = completeSafariNormalEventBattleContinuation(runtime, {
    target: "home",
    summary: { decision: 2, returnTarget: "home" },
    operations: [{ op: "run_end" }],
  });
  assert.equal(ended.result, "normal_event_battle_run_end");
  assert.equal(ended.target, "home");
  assert.equal(runtime.variables.mapless.board_consumed[0], false, "loss/run-end must not commit Street Performer as a successful completed event");
  assert.equal(runtime.variables.mapless.board_events[0].normal_resolved, false);
}

console.log("Safari Street Performer trainer callout smoke passed");
