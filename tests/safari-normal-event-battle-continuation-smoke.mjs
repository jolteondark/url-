import assert from "node:assert/strict";

import {
  beginSafariNormalEventBattleContinuation,
  bindSafariNormalEventBattleContinuation,
  completeSafariNormalEventBattleContinuation,
  pendingSafariNormalEventBattleContinuation,
  registerSafariNormalEventBattleContinuation,
} from "../runtime/safari-normal-event-battle-continuation.js";
import { returnSafariToDayBoard } from "../runtime/safari-normal-battle-lifecycle.js";

function runtimeFor(eventId = "honey_tree") {
  return {
    variables: {
      mapless: {
        day: 7,
        location: "day_board",
        board_events: [{ kind: "normal_event", normal_event_id: eventId }],
        board_revealed: [true],
        board_consumed: [false],
        board_visited: [true],
        last_operations: [],
        notice: "",
        battle: null,
      },
    },
    player: { party: [] },
    bag: { slots: [], money: 0 },
    storage_system: { boxes: [], currentBox: 0 },
  };
}

function bindCompletedBattle(runtime, eventId = "honey_tree", actionId = "shake") {
  const checkpoint = beginSafariNormalEventBattleContinuation(runtime, {
    boardIndex: 0,
    eventId,
    actionId,
    request: { start_wild_battle: true, type: "BUG" },
    payload: { fixture: true },
  });
  runtime.variables.mapless.battle = {
    kind: "wild",
    board_index: 0,
    turn: 2,
    decision: 1,
    completed: true,
    captured: false,
    foe: { species: "CATERPIE" },
    return_target: "day_board",
    last_operations: [],
    presentation: [],
  };
  bindSafariNormalEventBattleContinuation(runtime, checkpoint);
  return checkpoint;
}

{
  const runtime = runtimeFor();
  let commits = 0;
  const unregister = registerSafariNormalEventBattleContinuation("honey_tree", (current, continuation) => {
    commits += 1;
    assert.equal(continuation.actionId, "shake");
    assert.equal(continuation.battleReturn.decision, 1);
    assert.equal(current.variables.mapless.board_consumed[0], false, "generic Battle must not consume the normal-event cell first");
    current.variables.mapless.board_consumed[0] = true;
    return {
      runtime: current,
      result: "honey_tree_post_battle_complete",
      terminal: true,
      notice: "ハチミツの木の戦闘後処理を完了しました。",
      operations: [
        { op: "consume_normal_event", index: 0, eventId: "honey_tree" },
        { op: "request_save", reason: "normal_event_post_battle" },
      ],
    };
  });

  const checkpoint = bindCompletedBattle(runtime);
  assert.equal(runtime.variables.mapless.board_consumed[0], false);
  assert.equal(checkpoint.battle_started, true);
  assert.equal(runtime.variables.mapless.battle.origin, "normal_event");
  assert.equal(runtime.variables.mapless.battle.normal_event_continuation_key, checkpoint.key);

  const returned = returnSafariToDayBoard(runtime);
  assert.equal(returned.target, "day_board");
  assert.equal(returned.normalEventContinuation.result, "honey_tree_post_battle_complete");
  assert.equal(runtime.variables.mapless.battle, null);
  assert.equal(runtime.variables.mapless.board_consumed[0], true);
  assert.equal(commits, 1);
  assert.ok(returned.operations.some((operation) => operation.op === "return_to_day_board"));
  assert.ok(returned.operations.some((operation) => operation.op === "request_save" && operation.reason === "normal_event_post_battle"));

  const replay = completeSafariNormalEventBattleContinuation(runtime, {
    target: "day_board",
    summary: { decision: 1 },
  });
  assert.equal(replay.result, "honey_tree_post_battle_complete");
  assert.equal(commits, 1, "committed post-battle continuation must replay without duplicate reward/consume work");
  assert.equal(pendingSafariNormalEventBattleContinuation(runtime).committed, true);
  unregister();
}

{
  const runtime = runtimeFor("lost_pokemon");
  bindCompletedBattle(runtime, "lost_pokemon", "approach");
  assert.throws(
    () => returnSafariToDayBoard(runtime),
    /registered terminal continuation owner/,
  );
  assert.ok(runtime.variables.mapless.battle, "missing continuation owner must leave RESULT Battle retryable");
  assert.equal(runtime.variables.mapless.board_consumed[0], false);
  assert.equal(pendingSafariNormalEventBattleContinuation(runtime).committed, false);
}

{
  const runtime = runtimeFor("sleeping_giant");
  const checkpoint = beginSafariNormalEventBattleContinuation(runtime, {
    boardIndex: 0,
    eventId: "sleeping_giant",
    actionId: "wake",
    request: { start_wild_battle: true },
  });
  runtime.variables.mapless.battle = {
    kind: "wild",
    board_index: 0,
    decision: 2,
    completed: true,
    return_target: "home",
  };
  bindSafariNormalEventBattleContinuation(runtime, checkpoint);
  const runEndContinuation = completeSafariNormalEventBattleContinuation(runtime, {
    target: "home",
    summary: { decision: 2, returnTarget: "home" },
    operations: [{ op: "return_to_home" }],
  });
  assert.equal(runEndContinuation.result, "normal_event_battle_run_end");
  assert.equal(runEndContinuation.target, "home");
  assert.equal(pendingSafariNormalEventBattleContinuation(runtime).committed, true);
  assert.equal(runtime.variables.mapless.board_consumed[0], false, "loss/run-end must not force normal-event Day Board consumption");
}

console.log("safari normal-event battle continuation smoke: ok");
