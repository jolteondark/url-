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

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

function movePp(pokemon, id) {
  const move = (pokemon?.moves ?? []).find((entry) => moveId(entry) === id);
  return move && typeof move !== "string" && Number.isFinite(Number(move.pp)) ? Number(move.pp) : null;
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
assert.ok(state.battle, "successful Run must remain in Battle through RESULT until explicit RETURN");
assert.equal(state.battle.completed, true, "successful Run completion must be published only at RESULT");
assert.equal(state.battle.phase, "RESULT");
assert.equal(state.battle.completed_phase, "RESULT");
assert.equal(escaped.phase, "RESULT");
assert.deepEqual(
  escaped.phaseTrace.slice(-4).map((entry) => entry.phase),
  ["POST_FAINT", "POST_VICTORY", "REWARD_GROWTH", "RESULT"],
  "successful Run must pass through the central terminal tail",
);
assert.equal(escaped.operations.filter((operation) => operation.op === "request_save").length, 1,
  "RESULT must expose exactly one terminal save request");
assert.equal(escaped.operations.some((operation) => operation.op === "return_to_day_board"), false,
  "flee mechanics must not perform RETURN before the central RETURN phase");
assert.equal(state.location, "day_board", "Battle overlay remains anchored to the Day Board while RESULT is visible");
assert.equal(state.board_consumed[0], true, "successful Run must consume the wild Board cell exactly once");
assert.equal(state.board_visited[0], true, "successful Run must mark the Board cell visited exactly once");
assert.match(state.notice, /逃げ切った/);

// Save/Continue at RESULT must restore the completed Battle, not silently perform RETURN.
const resultStorage = new MemoryStorage();
web.saveSafariPlayableRun(resultStorage, runtime);
const resultFresh = web.createSafariPlayableRuntime();
const resultLoaded = web.loadSafariPlayableRun(resultStorage, resultFresh);
assert.equal(resultLoaded.found, true);
assert.equal(resultLoaded.state.variables.mapless.battle?.completed, true,
  "Continue from a RESULT checkpoint must restore the completed Battle");
assert.equal(resultLoaded.state.variables.mapless.battle?.phase, "RESULT");
assert.equal(resultLoaded.state.variables.mapless.battle?.completed_phase, "RESULT");

const returned = await web.returnSafariToDayBoard(runtime);
assert.equal(returned.target, "day_board");
assert.equal(returned.phase, "RETURN", "explicit return must be committed through the central RETURN phase");
assert.equal(returned.operations.filter((operation) => operation.op === "request_save").length, 1,
  "RETURN must request the Battle-cleared checkpoint exactly once");
assert.equal(state.battle, null, "successful RETURN must clear Battle after RESULT");
assert.equal(state.location, "day_board", "successful RETURN must reveal the Day Board");

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
assert.equal(restoredState.battle, null, "Continue after RETURN must not resurrect an escaped Battle");
assert.equal(restoredState.location, "day_board", "Continue after RETURN must restore Day Board");
assert.deepEqual(restoredState.board_consumed, expectedConsumed,
  "Continue must preserve the consumed escaped wild cell");
assert.deepEqual(restoredState.board_visited, expectedVisited,
  "Continue must preserve the visited escaped wild cell");
assert.deepEqual(restored.player.party, expectedParty,
  "Continue must preserve player state committed by Run");
assert.equal(globalThis.__maplessSafariRuntime, restored,
  "Continue must install the restored runtime as the shared Safari runtime");

// A fresh Continue must immediately re-enter the exact same ordinary Battle owner.
// Do not stop this mandatory regression at deserialization.
const trainerIndex = restoredState.board_events.findIndex((event, index) =>
  event?.kind === "trainer" && !restoredState.board_consumed[index]);
assert.ok(trainerIndex >= 0, "continued Day Board must retain an unconsumed ordinary trainer cell");
const trainerStarted = await web.activateSafariDayBoardCell(restored, trainerIndex);
assert.equal(trainerStarted.result, "dispatched");
assert.equal(restoredState.battle?.kind, "trainer");
assert.equal(restoredState.board_consumed[trainerIndex], false,
  "entering the first Battle after Continue must not consume the trainer cell");

const continuedPlayerIndex = Number(restoredState.battle.player_party_index ?? 0);
const continuedPlayer = restored.player.party[continuedPlayerIndex];
continuedPlayer.hp = 999999;
continuedPlayer.max_hp = 999999;
continuedPlayer.stats = {
  ...(continuedPlayer.stats ?? {}),
  DEFENSE: 9999,
  SPECIAL_DEFENSE: 9999,
  SPEED: 9999,
};
const continuedFoeIndex = Number(restoredState.battle.trainer_party_index ?? 0);
restoredState.battle.foe.hp = 999999;
restoredState.battle.foe.max_hp = 999999;
restoredState.battle.foe.stats = {
  ...(restoredState.battle.foe.stats ?? {}),
  DEFENSE: 9999,
  SPECIAL_DEFENSE: 9999,
  SPEED: 1,
};
if (Array.isArray(restoredState.battle.trainer_party) && restoredState.battle.trainer_party[continuedFoeIndex]) {
  restoredState.battle.trainer_party[continuedFoeIndex] = structuredClone(restoredState.battle.foe);
}

const continuedMoveId = moveId(continuedPlayer.moves.find((move) =>
  moveId(move) && (typeof move === "string" || Number(move.pp ?? 0) > 0)));
assert.ok(continuedMoveId, "continued active Pokemon must have a usable move");
const playerPpBefore = movePp(continuedPlayer, continuedMoveId);
const foeBefore = structuredClone(restoredState.battle.foe);
const turnBeforeContinueBattle = Number(restoredState.battle.turn ?? 1);
const continuedRound = await web.resolveSafariBattleRound(restored, continuedMoveId);
assert.equal(Number(restoredState.battle?.turn), turnBeforeContinueBattle + 1,
  "one command immediately after fresh Continue must advance exactly one ordinary Battle turn");
assert.equal(Number(continuedRound.decision), 0,
  "high-HP first-Continue fixture must remain nonterminal after exactly one turn");
assert.equal(restoredState.board_consumed[trainerIndex], false,
  "nonterminal first Battle turn after Continue must not consume the trainer cell");
if (playerPpBefore !== null) {
  assert.equal(movePp(restored.player.party[continuedPlayerIndex], continuedMoveId), playerPpBefore - 1,
    "first post-Continue player move must consume PP exactly once");
}
if (continuedRound.opponentChoice?.command === "move" && continuedRound.opponentChoice.moveId) {
  const foeMoveId = continuedRound.opponentChoice.moveId;
  const foePpBefore = movePp(foeBefore, foeMoveId);
  const foePpAfter = movePp(restoredState.battle.foe, foeMoveId);
  if (foePpBefore !== null && foePpAfter !== null) {
    assert.equal(foePpAfter, foePpBefore - 1,
      "first post-Continue foe response must consume PP exactly once");
  }
}

console.log("Safari Run RESULT -> save/Continue -> RETURN -> save/Continue -> first ordinary trainer command: ok");

// Keep the real-game progression vertical in the same normal/battle-entry gate.
await import("./safari-multi-cell-multi-day-progression-smoke.mjs");
