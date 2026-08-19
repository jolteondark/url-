import "./safari-capture-reward-growth-checkpoint-smoke.mjs";
import assert from "node:assert/strict";
import { materializeSafariCaptureRandomValues } from "../runtime/safari-normal-battle-lifecycle.js";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const web = await import("../runtime/safari-web-playable-integration.js");

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

assert.deepEqual(materializeSafariCaptureRandomValues(1), [62501, 33003, 12172, 5192],
  "normal Safari capture must materialize Ruby-compatible seeded pbRandom(65536) draws");

const storage = new MemoryStorage();
const runtime = web.createSafariPlayableRuntime();
const state = runtime.variables.mapless;
state.board_events[0] = { kind: "wild", type: "BUG", slot: 0 };
state.board_revealed[0] = true;
state.board_consumed[0] = false;
state.board_visited[0] = false;
state.battle = null;
state.location = "day_board";

const started = await web.activateSafariDayBoardCell(runtime, 0);
assert.equal(started.result, "dispatched");
assert.ok(state.battle && state.battle.kind === "wild" && !state.battle.completed);

const partyBefore = runtime.player.party.length;
const storedBefore = runtime.storage_system.boxes.reduce(
  (sum, box) => sum + box.slots.filter(Boolean).length,
  0,
);
const capture = await web.attemptSafariCapture(runtime, {
  captureRandomSeed: 1,
  randomValues: [0, 0, 0, 0],
});
assert.equal(capture.result, "caught", "fixture capture must succeed with explicit deterministic test draws");
assert.deepEqual(capture.randomValues, [0, 0, 0, 0],
  "explicit test draws must remain authoritative without becoming a runtime default");
assert.equal(state.battle.completed, true);
assert.equal(state.battle.decision, 4);
assert.equal(state.board_consumed[0], true);
const partyAfterCapture = runtime.player.party.length;
const storedAfterCapture = runtime.storage_system.boxes.reduce(
  (sum, box) => sum + box.slots.filter(Boolean).length,
  0,
);
assert.ok(partyAfterCapture > partyBefore || storedAfterCapture > storedBefore,
  "caught Pokemon must route to Party or Storage before save");

const returned = await web.returnSafariToDayBoard(runtime);
assert.equal(returned.result, "returned");
assert.equal(state.battle, null);
assert.equal(state.location, "day_board");

const expectedParty = structuredClone(runtime.player.party);
const expectedStorage = structuredClone(runtime.storage_system);
const expectedConsumed = structuredClone(state.board_consumed);
const expectedVisited = structuredClone(state.board_visited);
const expectedBag = structuredClone(runtime.bag);

const saved = web.saveSafariPlayableRun(storage, runtime);
assert.ok(saved.payload, "save must produce a payload");
assert.equal(web.hasSafariPlayableRun(storage), true, "Continue must become available after save");

const fresh = web.createSafariPlayableRuntime();
assert.notDeepEqual(fresh.player.party, expectedParty,
  "fresh runtime must not already contain the captured Party state");
const loaded = web.loadSafariPlayableRun(storage, fresh);
assert.equal(loaded.found, true, "Continue must find the saved run");
const restored = loaded.state;
const restoredState = restored.variables.mapless;
assert.deepEqual(restored.player.party, expectedParty,
  "Continue must restore captured Party state exactly");
assert.deepEqual(restored.storage_system, expectedStorage,
  "Continue must restore captured Storage state exactly");
assert.deepEqual(restoredState.board_consumed, expectedConsumed,
  "Continue must preserve completed Board cells");
assert.deepEqual(restoredState.board_visited, expectedVisited,
  "Continue must preserve Board visit state");
assert.deepEqual(restored.bag, expectedBag,
  "Continue must preserve Bag/money alongside capture state");
assert.equal(restoredState.battle, null, "Continue after Board return must not resurrect Battle state");
assert.equal(restoredState.location, "day_board", "Continue must resume on Day Board");
assert.equal(globalThis.__maplessSafariRuntime, restored,
  "loaded runtime must become the shared Safari runtime");

console.log("Safari seeded capture -> Party/Storage -> save -> Continue -> Board state restore: ok");
