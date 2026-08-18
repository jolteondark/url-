import assert from "node:assert/strict";
import { createSafariPlayableRuntime } from "../runtime/safari-web-startup.js";
import { activateSafariDayBoardCell } from "../runtime/safari-pokemon-center-command.js";
import { resolveSafariStreetPerformerInteraction } from "../runtime/safari-street-performer-interaction.js";

function runtimeFor(money = 1000) {
  const runtime = createSafariPlayableRuntime();
  const state = runtime.variables.mapless;
  state.board_events[0] = {
    kind: "normal_event",
    slot: 0,
    normal_event_id: "street_performer",
    normal_seed: 12345,
    normal_resolved: false,
    normal_data: { fraud_roll: 98 },
  };
  state.board_revealed[0] = false;
  state.board_visited[0] = false;
  state.board_consumed[0] = false;
  runtime.bag.money = money;
  runtime.player.party[0].hp = 10;
  return runtime;
}

const originalConfirm = globalThis.confirm;
try {
  globalThis.confirm = () => true;
  const watched = runtimeFor();
  const watchResult = activateSafariDayBoardCell(watched, 0);
  assert.equal(watchResult.boundary, "normal_event");
  assert.equal(watchResult.result, "watched_show");
  assert.equal(watchResult.persistenceRequested, true);
  assert.equal(watched.bag.money, 700);
  assert.equal(watched.player.party[0].hp, 13);
  assert.equal(watched.variables.mapless.mapless_exp_show_battles, 1);
  assert.equal(watched.variables.mapless.board_consumed[0], true);
  assert.equal(watched.variables.mapless.board_visited[0], true);
  assert.equal(watched.variables.mapless.board_events[0].normal_resolved, true);
  assert.ok(!watched.variables.mapless.last_operations.some((operation) => operation.op === "request_external_normal_event"));

  const poor = runtimeFor(100);
  const poorResult = resolveSafariStreetPerformerInteraction(poor, 0, "watch");
  assert.equal(poorResult.result, "insufficient_money");
  assert.equal(poorResult.completed, false);
  assert.equal(poor.bag.money, 100);
  assert.equal(poor.player.party[0].hp, 10);
  assert.equal(poor.variables.mapless.board_consumed[0], false);
  assert.equal(poor.variables.mapless.board_events[0].normal_resolved, false);

  globalThis.confirm = () => false;
  const left = runtimeFor();
  const leaveResult = activateSafariDayBoardCell(left, 0);
  assert.equal(leaveResult.result, "left");
  assert.equal(left.bag.money, 1000);
  assert.equal(left.variables.mapless.board_consumed[0], true);
  assert.equal(left.variables.mapless.board_events[0].normal_resolved, true);

  console.log("Safari Street Performer Board watch/leave/insufficient-money vertical: ok");
} finally {
  if (originalConfirm === undefined) delete globalThis.confirm;
  else globalThis.confirm = originalConfirm;
}
