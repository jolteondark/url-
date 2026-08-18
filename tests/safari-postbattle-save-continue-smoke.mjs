import assert from "node:assert/strict";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

const web = await import("../runtime/safari-web-playable-integration.js");
const { attemptSafariFlee } = await import("../runtime/safari-flee-command.js");

const storage = new MemoryStorage();
const runtime = web.createSafariPlayableRuntime();
const state = runtime.variables.mapless;
const wildIndex = state.board_events.findIndex((event) => event?.kind === "wild");
assert.ok(wildIndex >= 0, "fresh Day Board must contain a wild cell");

const starter = runtime.player.party[0];
starter.personal_id = 326001;
starter.hp = 999;
starter.max_hp = 999;
starter.stats = { ...starter.stats, DEFENSE: 999, SPECIAL_DEFENSE: 999, SPEED: 999 };
const firstMoveBefore = starter.moves[0];
const moveId = typeof firstMoveBefore === "string" ? firstMoveBefore : firstMoveBefore?.id;
assert.ok(moveId, "starter must have a usable first move");
const ppBefore = typeof firstMoveBefore === "string" ? null : Number(firstMoveBefore.pp);

const started = await web.activateSafariDayBoardCell(runtime, wildIndex);
assert.equal(started.result, "dispatched");
assert.ok(state.battle && state.battle.kind === "wild" && !state.battle.completed);
assert.equal(state.board_consumed[wildIndex], false);

const turnBefore = Number(state.battle.turn ?? 1);
const round = await web.resolveSafariBattleRound(runtime, moveId);
assert.equal(Number(state.battle?.turn ?? turnBefore + 1), turnBefore + 1,
  "one selected move must advance exactly one Battle turn while the wild battle remains active");
assert.ok([0, 1, 2].includes(Number(round.decision)));
assert.ok(Number(runtime.player.party[0].hp) > 0, "high-HP test starter must survive the first round");
if (ppBefore !== null) {
  assert.equal(Number(runtime.player.party[0].moves[0].pp), ppBefore - 1,
    "one selected move must consume exactly one PP");
}

state.battle.foe.stats = { ...(state.battle.foe.stats ?? {}), SPEED: 1 };
runtime.player.party[0].stats = { ...(runtime.player.party[0].stats ?? {}), SPEED: 999 };
const escaped = attemptSafariFlee(runtime, { runRandomSeed: 1, randomRoll: 255 });
assert.equal(escaped.escaped, true);
assert.equal(state.battle, null);
assert.equal(state.board_consumed[wildIndex], true);
assert.equal(state.board_visited[wildIndex], true);
assert.ok(escaped.operations.some((operation) => operation.op === "request_save"));

const hpAfterBattle = Number(runtime.player.party[0].hp);
const ppAfterBattle = typeof runtime.player.party[0].moves[0] === "string"
  ? null
  : Number(runtime.player.party[0].moves[0].pp);
const boardConsumed = structuredClone(state.board_consumed);
const boardVisited = structuredClone(state.board_visited);
const boardEvents = structuredClone(state.board_events);
const bag = structuredClone(runtime.bag);

const saved = web.saveSafariPlayableRun(storage, runtime);
assert.ok(saved?.key, "post-battle Day Board state must save");

const fresh = web.createSafariPlayableRuntime();
const loaded = web.loadSafariPlayableRun(storage, fresh);
assert.equal(loaded.found, true);
const resumed = loaded.state;
const resumedState = resumed.variables.mapless;
assert.equal(resumedState.battle, null, "Continue must not resurrect the escaped Battle");
assert.deepEqual(resumedState.board_events, boardEvents, "Continue must restore the same Day Board");
assert.deepEqual(resumedState.board_consumed, boardConsumed, "consumed combat cell must stay consumed");
assert.deepEqual(resumedState.board_visited, boardVisited, "visited combat cell must stay visited");
assert.equal(resumedState.board_consumed[wildIndex], true);
assert.equal(resumed.player.party[0].personal_id, 326001, "same Pokemon individual must survive Save/Continue");
assert.equal(Number(resumed.player.party[0].hp), hpAfterBattle, "post-turn HP must survive Save/Continue exactly");
if (ppAfterBattle !== null) {
  assert.equal(Number(resumed.player.party[0].moves[0].pp), ppAfterBattle,
    "post-turn PP must survive Save/Continue exactly");
}
assert.deepEqual(resumed.bag, bag, "Bag/Money must survive the same post-battle Save/Continue");

console.log("Safari wild turn -> flee -> save -> fresh Continue HP/PP/Board continuity: ok");
