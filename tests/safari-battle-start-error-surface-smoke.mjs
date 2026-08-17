import assert from "node:assert/strict";

globalThis.window = {};

const { createSafariPlayableRuntime } = await import("../runtime/safari-web-startup.js");
const { activateSafariWebCombatCell } = await import("../runtime/safari-web-combat-start.js");

function state(runtime) {
  return runtime.variables.mapless;
}

function prepareCell(runtime, event) {
  const current = state(runtime);
  current.board_events[0] = { ...event, slot: 0 };
  current.board_revealed[0] = true;
  current.board_consumed[0] = false;
  current.battle = null;
  return current;
}

const failedRuntime = createSafariPlayableRuntime();
prepareCell(failedRuntime, { kind: "wild", type: "NOT_A_CANONICAL_TYPE" });
let failure = null;
try {
  await activateSafariWebCombatCell(failedRuntime, 0);
} catch (error) {
  failure = error;
}
assert.ok(failure instanceof Error, "invalid combat data must reject with the real runtime exception");
assert.equal(globalThis.__maplessLastError, failure, "Safari must retain the exact Battle-start exception instead of hiding it behind presentation");
assert.equal(state(failedRuntime).battle, null, "failed Battle start must not leave a partial Battle scene state");
assert.equal(state(failedRuntime).board_consumed[0], false, "failed Battle start must leave the board cell retryable");

const successfulRuntime = createSafariPlayableRuntime();
prepareCell(successfulRuntime, { kind: "wild", type: "BUG" });
const success = await activateSafariWebCombatCell(successfulRuntime, 0);
assert.equal(success.boundary, "wild");
assert.ok(state(successfulRuntime).battle, "successful combat entry must create Battle state");
assert.equal(globalThis.__maplessLastError, null, "a later successful Battle start must clear a stale startup exception");

console.log("Safari Battle-start real exception surface: ok");
