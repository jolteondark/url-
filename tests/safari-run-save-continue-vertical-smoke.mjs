import assert from "node:assert/strict";
import { attemptSafariFlee } from "../runtime/safari-flee-command.js";

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

const playerIndex = Number(state.battle.player_party_index ?? 0);
runtime.player.party[playerIndex].stats.SPEED = 999;
state.battle.foe.stats.SPEED = 1;
const escaped = attemptSafariFlee(runtime, { runRandomSeed: 1, randomRoll: 255 });
assert.equal(escaped.escaped, true, "fast player must escape the real Safari wild Battle");
assert.equal(escaped.resolution.reason, "speed_escape");
assert.equal(state.battle, null, "successful Run must clear Battle immediately");
assert.equal(state.location, "day_board", "successful Run must return to Day Board");
assert.equal(state.board_consumed[0], true, "successful Run must consume the wild Board cell");
assert.equal(state.board_visited[0], true, "successful Run must mark the Board cell visited");
assert.match(state.notice, /逃げ切った/);

const expectedConsumed = structuredClone(state.board_consumed);
const expectedVisited = structuredClone(state.board_visited);
const expectedParty = structuredClone(runtime.player.party);
const storage = new MemoryStorage();
const saved = web.saveSafariPlayableRun(storage, runtime);
assert.ok(saved.payload);
assert.equal(web.hasSafariPlayableRun(storage), true);

const fresh = web.createSafariPlayableRuntime();
const loaded = web.loadSafariPlayableRun(storage, fresh);
assert.equal(loaded.found, true);
const restored = loaded.state;
const restoredState = restored.variables.mapless;
assert.equal(restoredState.battle, null, "Continue must not resurrect an escaped Battle");
assert.equal(restoredState.location, "day_board", "Continue must restore Day Board after Run");
assert.deepEqual(restoredState.board_consumed, expectedConsumed,
  "Continue must preserve the consumed escaped wild cell");
assert.deepEqual(restoredState.board_visited, expectedVisited,
  "Continue must preserve the visited escaped wild cell");
assert.deepEqual(restored.player.party, expectedParty,
  "Continue must preserve player state committed by Run");
assert.equal(globalThis.__maplessSafariRuntime, restored,
  "Continue must install the restored runtime as the shared Safari runtime");

console.log("Safari Run -> Board state -> save -> Continue: ok");

// Keep the real-game progression vertical in the same normal/battle-entry gate.
await import("./safari-multi-cell-multi-day-progression-smoke.mjs");
