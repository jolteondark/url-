import assert from "node:assert/strict";

const runtimeEvents = [];
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = {
  dispatchEvent(event) { runtimeEvents.push(event?.type); return true; },
};

const demand = await import("../runtime/safari-general-data-demand.js");
const { createSafariPlayableRuntime } = await import("../runtime/safari-web-startup.js");
const { activateSafariWebCombatCell } = await import("../runtime/safari-web-combat-start.js");

await demand.ensureSafariGeneralCombatData("wild");
assert.equal(demand.safariGeneralCombatReady("wild"), true);

const runtime = createSafariPlayableRuntime();
const state = runtime.variables.mapless;
state.board_events[0] = { kind: "wild", type: "BUG", slot: 0 };
state.board_revealed[0] = false;
state.board_consumed[0] = false;
state.battle = null;
state.shop = null;
state.location = "day_board";

const previousBoardEvents = state.board_events;
const previousBoardRevealed = state.board_revealed;
const previousBoardConsumed = state.board_consumed;
const previousNotice = state.notice;
const previousLastOperations = state.last_operations;
const hadEncounterSeed = Object.prototype.hasOwnProperty.call(state, "preview_encounter_seed");
const previousEncounterSeed = state.preview_encounter_seed;
const hadEncounterCounter = Object.prototype.hasOwnProperty.call(state, "preview_encounter_counter");
const previousEncounterCounter = state.preview_encounter_counter;

const injected = new Error("injected post-materialization runtime handoff failure");
const realQueueMicrotask = globalThis.queueMicrotask;
let handoffCalls = 0;
globalThis.queueMicrotask = (callback) => {
  handoffCalls += 1;
  if (handoffCalls === 1) throw injected;
  return realQueueMicrotask(callback);
};
try {
  await assert.rejects(
    () => activateSafariWebCombatCell(runtime, 0),
    (error) => error === injected,
    "post-materialization handoff failure must preserve the exact Error",
  );
} finally {
  globalThis.queueMicrotask = realQueueMicrotask;
}

assert.equal(handoffCalls, 2, "failed post-materialization handoff must repaint the restored Board once");
assert.equal(state.board_events, previousBoardEvents, "failed handoff must restore the pre-click board event owner");
assert.equal(state.board_revealed, previousBoardRevealed, "failed handoff must restore board reveal state");
assert.equal(state.board_consumed, previousBoardConsumed, "failed handoff must restore board consumption state");
assert.equal(state.board_revealed[0], false, "failed handoff must leave the cell unrevealed");
assert.equal(state.board_consumed[0], false, "failed handoff must leave the cell retryable");
assert.equal(state.battle, null, "failed handoff must remove the newly materialized partial Battle state");
assert.equal(state.notice, previousNotice, "failed handoff must restore the prior Board notice");
assert.equal(state.last_operations, previousLastOperations, "failed handoff must restore the prior operation surface");
if (hadEncounterSeed) assert.equal(state.preview_encounter_seed, previousEncounterSeed);
else assert.equal(Object.prototype.hasOwnProperty.call(state, "preview_encounter_seed"), false);
if (hadEncounterCounter) assert.equal(state.preview_encounter_counter, previousEncounterCounter);
else assert.equal(Object.prototype.hasOwnProperty.call(state, "preview_encounter_counter"), false);
assert.equal(globalThis.__maplessLastError, injected, "exact handoff failure must remain available for real-device diagnosis");

// Retry the exact same selected encounter in the same browser-like session.
// GENERAL masters/modules are already warm, so the retry must reuse the existing
// owner, materialize the selected foe again, and commit the cell only on success.
const retry = await activateSafariWebCombatCell(runtime, 0);
assert.equal(retry.result, "dispatched", "retry must enter the same wild Battle owner");
assert.equal(state.battle?.kind, "wild", "retry must materialize a wild Battle");
assert.equal(state.battle?.board_index, 0, "retry must preserve the selected board cell");
assert.equal(state.board_consumed[0], true, "successful retry must consume the cell exactly once");
assert.equal(globalThis.__maplessLastError, null, "successful retry must clear the prior exact Error");
assert.equal(demand.safariGeneralCombatReady("wild"), true, "retry must keep the selected GENERAL owner ready");
assert.equal(demand.safariGeneralCombatReady("trainer"), false, "wild retry must not demand the unrelated trainer owner");

console.log("Safari combat post-materialization failure -> atomic rollback -> same-cell retry: ok");
