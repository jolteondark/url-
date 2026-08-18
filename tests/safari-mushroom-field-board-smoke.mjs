import assert from "node:assert/strict";
import { createSafariPlayableRuntime } from "../runtime/safari-web-startup.js";
import { activateSafariDayBoardCell } from "../runtime/safari-pokemon-center-command.js";

function runtimeFor({ day = 1, carryClass = "general" } = {}) {
  const runtime = createSafariPlayableRuntime();
  const state = runtime.variables.mapless;
  state.day = day;
  state.mapless_carry_class = carryClass;
  state.board_events[0] = { kind: "normal_event", slot: 0, normal_event_id: "mushroom_field", normal_seed: 12345, normal_resolved: false, normal_data: {} };
  state.board_revealed[0] = false;
  state.board_visited[0] = false;
  state.board_consumed[0] = false;
  runtime.bag.money = 1000;
  return runtime;
}

const originalConfirm = globalThis.confirm;
try {
  globalThis.confirm = () => true;
  const general = runtimeFor();
  const sold = activateSafariDayBoardCell(general, 0);
  assert.equal(sold.result, "sold");
  assert.equal(sold.boundary, "normal_event");
  assert.equal(sold.persistenceRequested, true);
  assert.equal(general.bag.money, 1400);
  assert.equal(general.variables.mapless.board_consumed[0], true);
  assert.equal(general.variables.mapless.board_events[0].normal_resolved, true);

  const special = runtimeFor({ day: 6, carryClass: "special" });
  const specialSold = activateSafariDayBoardCell(special, 0);
  assert.equal(specialSold.result, "sold");
  assert.equal(special.bag.money, 1468, "520 canonical gain * 0.9 special carry modifier");
  assert.equal(special.variables.mapless.last_operations.at(-1).adjusted, 468);

  globalThis.confirm = () => false;
  const left = runtimeFor();
  const leaveResult = activateSafariDayBoardCell(left, 0);
  assert.equal(leaveResult.result, "left");
  assert.equal(left.bag.money, 1000);
  assert.equal(left.variables.mapless.board_consumed[0], true);

  console.log("Safari Mushroom Field Board sell/leave + carry-class money vertical: ok");
} finally {
  if (originalConfirm === undefined) delete globalThis.confirm;
  else globalThis.confirm = originalConfirm;
}
