import assert from "node:assert/strict";

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const web = await import("../runtime/safari-web-playable-integration.js");
const runtime = web.createSafariPlayableRuntime();
const state = runtime.variables.mapless;

state.day = 10;
state.location = "boundary_trial";
state.boundary_trial = {
  day: 11,
  trial_count: 1,
  trial_cleared: true,
  trial_floor: 10,
  result: "victory_returned_to_board",
};
state.battle = {
  origin: "boundary_trial",
  kind: "trainer",
  completed: true,
  decision: 1,
  return_target: "day_board",
};

const returned = await web.returnSafariToDayBoard(runtime);
assert.equal(returned.target, "day_board");
assert.equal(state.location, "day_board");
assert.equal(state.day, 11, "boundary Result return must materialize DAY 11");
assert.equal(state.battle, null, "boundary Result return must clear the completed Battle");
assert.equal(state.board_events.length, 8, "DAY 11 return must own a complete Board");
assert.ok(state.board_events.some((event) => event?.kind === "next_day"), "DAY 11 Board must retain stairs/next_day");
assert.equal(returned.persistenceRequested, true, "DAY 11 return must explicitly request persistence");
assert.ok(returned.operations.some((operation) => operation?.op === "request_save"),
  "web persistence contract must expose request_save after boundary return");

const expectedBoardEvents = structuredClone(state.board_events);
const expectedRevealed = structuredClone(state.board_revealed);
const expectedConsumed = structuredClone(state.board_consumed);
const expectedVisited = structuredClone(state.board_visited);
const expectedParty = structuredClone(runtime.player.party);
const expectedBag = structuredClone(runtime.bag);
const storage = new MemoryStorage();
web.saveSafariPlayableRun(storage, runtime);

const fresh = web.createSafariPlayableRuntime();
const loaded = web.loadSafariPlayableRun(storage, fresh);
assert.equal(loaded.found, true);
const restored = loaded.state;
const restoredState = restored.variables.mapless;
assert.equal(restoredState.location, "day_board", "fresh Continue must not resurrect the boundary Result scene");
assert.equal(restoredState.day, 11, "fresh Continue must resume the committed DAY 11 Board");
assert.equal(restoredState.battle, null, "fresh Continue must keep boundary Battle cleared");
assert.deepEqual(restoredState.board_events, expectedBoardEvents);
assert.deepEqual(restoredState.board_revealed, expectedRevealed);
assert.deepEqual(restoredState.board_consumed, expectedConsumed);
assert.deepEqual(restoredState.board_visited, expectedVisited);
assert.deepEqual(restored.player.party, expectedParty, "boundary return/Continue must preserve Party state");
assert.deepEqual(restored.bag, expectedBag, "boundary return/Continue must preserve Bag/Money state");
assert.equal(globalThis.__maplessSafariRuntime, restored, "Continue must install the restored shared runtime identity");

console.log("Safari boundary Result -> DAY 11 -> save -> fresh Continue: ok");
