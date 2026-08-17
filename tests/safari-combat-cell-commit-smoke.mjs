import assert from "node:assert/strict";

// Exercise the same public Day Board combat entry used by preview-app without
// importing presentation-only DOM owners.
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const { createSafariPlayableRuntime } = await import("../runtime/safari-web-startup.js");
const { activateSafariDayBoardCell } = await import("../runtime/safari-web-playable-integration.js");

function state(runtime) { return runtime.variables.mapless; }
function prepare(runtime, event) {
  const current = state(runtime);
  current.board_events[0] = { ...event, slot: 0 };
  current.board_revealed[0] = false;
  current.board_consumed[0] = false;
  current.battle = null;
  current.shop = null;
  current.location = "day_board";
}

for (const event of [
  { kind: "wild", type: "BUG" },
  { kind: "trainer", trainer_seed: 12345 },
]) {
  const runtime = createSafariPlayableRuntime();
  prepare(runtime, event);
  const result = await activateSafariDayBoardCell(runtime, 0);
  assert.equal(result.result, "dispatched");
  assert.ok(state(runtime).battle, `${event.kind} must create Battle before committing the cell`);
  assert.equal(state(runtime).board_revealed[0], true);
  assert.equal(state(runtime).board_consumed[0], true, `${event.kind} successful Battle start must consume the Day Board cell`);
}

const failed = createSafariPlayableRuntime();
prepare(failed, { kind: "wild", type: "NOT_A_CANONICAL_TYPE" });
await assert.rejects(() => activateSafariDayBoardCell(failed, 0), /unknown General Encounter type/);
assert.equal(state(failed).battle, null, "failed materialization must not leave Battle state");
assert.equal(state(failed).board_revealed[0], false, "failed materialization must restore reveal state");
assert.equal(state(failed).board_consumed[0], false, "failed materialization must leave the cell retryable");

console.log("Safari Day Board combat cell commits only after Battle state exists: ok");
