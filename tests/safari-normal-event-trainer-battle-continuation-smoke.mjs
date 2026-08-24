import assert from "node:assert/strict";

import { activateSafariNormalEventTrainerBattle } from "../runtime/safari-web-combat-start.js";
import {
  completeSafariNormalEventBattleContinuation,
  pendingSafariNormalEventBattleContinuation,
  registerSafariNormalEventBattleContinuation,
} from "../runtime/safari-normal-event-battle-continuation.js";
import { returnSafariToDayBoard } from "../runtime/safari-normal-battle-lifecycle.js";

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
          normal_data: { fraud_roll: 12 },
        }],
        board_revealed: [true],
        board_consumed: [false],
        board_visited: [true],
        last_operations: [],
        notice: "",
        battle: null,
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
  let commits = 0;
  const unregister = registerSafariNormalEventBattleContinuation("street_performer", (current, continuation) => {
    commits += 1;
    assert.equal(continuation.actionId, "callout");
    assert.equal(continuation.battleReturn.decision, 1);
    assert.equal(current.variables.mapless.board_consumed[0], false, "generic trainer Battle must not consume the normal-event cell first");
    current.variables.mapless.board_consumed[0] = true;
    return {
      runtime: current,
      result: "street_performer_fraud_battle_complete",
      terminal: true,
      operations: [
        { op: "consume_normal_event", index: 0, eventId: "street_performer" },
        { op: "request_save", reason: "normal_event_post_trainer_battle" },
      ],
    };
  });

  const started = await activateSafariNormalEventTrainerBattle(runtime, 0, {
    eventId: "street_performer",
    actionId: "callout",
    battleEvent: { op: "start_trainer_battle", modifier: 0, seed: 12345 },
    request: { start_trainer_battle: true, modifier: 0, seed: 12345 },
    payload: { canonicalOutcome: "fraud_battle" },
  });

  assert.equal(started.result, "normal_event_trainer_battle_started");
  assert.equal(started.boundary, "trainer");
  assert.equal(runtime.variables.mapless.board_consumed[0], false, "source normal event remains until the continuation commits");
  assert.equal(runtime.variables.mapless.battle.kind, "trainer");
  assert.equal(runtime.variables.mapless.battle.origin, "normal_event");
  assert.equal(runtime.variables.mapless.battle.normal_event_continuation_key, started.continuationKey);
  assert.equal(runtime.variables.mapless.battle.trainer_seed, 12345);
  assert.equal(pendingSafariNormalEventBattleContinuation(runtime).battle_started, true);

  runtime.variables.mapless.battle.completed = true;
  runtime.variables.mapless.battle.decision = 1;
  runtime.variables.mapless.battle.return_target = "day_board";
  const returned = returnSafariToDayBoard(runtime);
  assert.equal(returned.target, "day_board");
  assert.equal(returned.normalEventContinuation.result, "street_performer_fraud_battle_complete");
  assert.equal(runtime.variables.mapless.board_consumed[0], true);
  assert.equal(commits, 1);
  assert.ok(returned.operations.some((operation) => operation.op === "request_save" && operation.reason === "normal_event_post_trainer_battle"));

  const replay = completeSafariNormalEventBattleContinuation(runtime, {
    target: "day_board",
    summary: { decision: 1 },
  });
  assert.equal(replay.result, "street_performer_fraud_battle_complete");
  assert.equal(commits, 1, "committed trainer continuation must replay without duplicate event work");
  unregister();
}

{
  const runtime = runtimeFor();
  await assert.rejects(
    () => activateSafariNormalEventTrainerBattle(runtime, 0, {
      eventId: "street_performer",
      actionId: "callout",
      battleEvent: { op: "start_trainer_battle", modifier: 2, seed: 9, type: "FIRE" },
    }),
    /constraint is not yet owned by the shared trainer generator: type/,
  );
  assert.equal(runtime.variables.mapless.battle, null);
  assert.equal(runtime.variables.mapless.board_consumed[0], false);
  assert.equal(pendingSafariNormalEventBattleContinuation(runtime), null, "unsupported trainer constraints must fail before checkpoint creation");
}

console.log("safari normal-event trainer Battle continuation smoke: ok");
