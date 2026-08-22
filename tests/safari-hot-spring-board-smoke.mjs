import assert from "node:assert/strict";
import { createSafariPlayableRuntime } from "../runtime/safari-web-startup.js";
import { activateSafariDayBoardCell } from "../runtime/safari-pokemon-center-command.js";
import { resolveSafariHotSpringInteraction } from "../runtime/safari-hot-spring-interaction.js";
import { openSafariNormalEventTouch } from "../runtime/safari-normal-event-touch-handoff.js";

function runtimeFor(seed) {
  const runtime = createSafariPlayableRuntime();
  const state = runtime.variables.mapless;
  state.board_events[0] = { kind: "normal_event", slot: 0, normal_event_id: "hot_spring", normal_seed: seed, normal_resolved: false, normal_data: {} };
  state.board_revealed[0] = false;
  state.board_visited[0] = false;
  state.board_consumed[0] = false;
  runtime.player.party[0].hp = 10;
  return runtime;
}

const half = runtimeFor(0);
const halfResult = resolveSafariHotSpringInteraction(half, 0, "enter");
assert.equal(halfResult.roll, 44);
assert.equal(halfResult.result, "enter_half_heal");
assert.equal(half.player.party[0].hp, 24);
assert.equal(half.variables.mapless.board_events[0].normal_data.enter_roll, 44);
assert.equal(half.variables.mapless.board_consumed[0], true);

const full = runtimeFor(8);
full.player.party[0].status = "POISON";
full.player.party[0].moves[0].pp = 1;
const fullResult = resolveSafariHotSpringInteraction(full, 0, "enter");
assert.equal(fullResult.roll, 67);
assert.equal(fullResult.result, "enter_full_heal");
assert.equal(full.player.party[0].hp, 28);
assert.equal(full.player.party[0].status, "NONE");
assert.equal(full.player.party[0].moves[0].pp, 35);

const burned = runtimeFor(12345);
const burnResult = resolveSafariHotSpringInteraction(burned, 0, "enter");
assert.equal(burnResult.roll, 98);
assert.equal(burnResult.result, "enter_burn");
assert.equal(burned.player.party[0].hp, 5);
assert.equal(burned.player.party[0].status, "BURN");

const safe = runtimeFor(12345);
safe.player.party[0].types = ["WATER"];
safe.player.party[0].status = "POISON";
safe.player.party[0].moves[0].pp = 1;
const originalDocumentForSafe = globalThis.document;
globalThis.document = {};
try {
  const ready = openSafariNormalEventTouch(safe, 0);
  assert.deepEqual(ready.availableActions, ["safe", "enter", "leave"]);
} finally {
  globalThis.__maplessNormalEventUi = null;
  if (originalDocumentForSafe === undefined) delete globalThis.document;
  else globalThis.document = originalDocumentForSafe;
}
const safeResult = resolveSafariHotSpringInteraction(safe, 0, "safe");
assert.equal(safeResult.roll, null, "safe route must not consume the random enter roll");
assert.equal(safeResult.result, "safe_full_heal");
assert.equal(safe.player.party[0].hp, 28);
assert.equal(safe.player.party[0].status, "NONE");
assert.equal(safe.player.party[0].moves[0].pp, 35);
assert.equal(safe.variables.mapless.board_consumed[0], true);

const unsafe = runtimeFor(0);
assert.equal(resolveSafariHotSpringInteraction(unsafe, 0, "safe").completed, false, "safe route must remain unavailable without a usable WATER/ICE party member");
assert.equal(unsafe.variables.mapless.board_consumed[0], false);

const originalConfirm = globalThis.confirm;
try {
  globalThis.confirm = () => false;
  const left = runtimeFor(0);
  const leaveResult = activateSafariDayBoardCell(left, 0);
  assert.equal(leaveResult.boundary, "normal_event");
  assert.equal(leaveResult.result, "left");
  assert.equal(left.player.party[0].hp, 10);
  assert.equal(left.variables.mapless.board_consumed[0], true);
} finally {
  if (originalConfirm === undefined) delete globalThis.confirm;
  else globalThis.confirm = originalConfirm;
}

console.log("Safari Hot Spring Board canonical enter/safe/leave vertical: ok");
