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

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

function movePp(pokemon, id) {
  const move = (pokemon?.moves ?? []).find((entry) => moveId(entry) === id);
  return move && typeof move !== "string" && Number.isFinite(Number(move.pp)) ? Number(move.pp) : null;
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
const selectedMoveId = moveId(firstMoveBefore);
assert.ok(selectedMoveId, "starter must have a usable first move");
const ppBefore = typeof firstMoveBefore === "string" ? null : Number(firstMoveBefore.pp);

const started = await web.activateSafariDayBoardCell(runtime, wildIndex);
assert.equal(started.result, "dispatched");
assert.ok(state.battle && state.battle.kind === "wild" && !state.battle.completed);
assert.equal(state.board_consumed[wildIndex], false);

const turnBefore = Number(state.battle.turn ?? 1);
const round = await web.resolveSafariBattleRound(runtime, selectedMoveId);
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

// Continue must feed directly back into the same ordinary Battle owner. Exercise a
// real trainer cell and one command instead of stopping at deserialization.
const trainerIndex = resumedState.board_events.findIndex((event, index) =>
  event?.kind === "trainer" && !resumedState.board_consumed[index]);
assert.ok(trainerIndex >= 0, "continued Day Board must retain an unconsumed ordinary trainer cell");
const trainerStarted = await web.activateSafariDayBoardCell(resumed, trainerIndex);
assert.equal(trainerStarted.result, "dispatched");
assert.equal(resumedState.battle?.kind, "trainer");
assert.equal(resumedState.board_consumed[trainerIndex], false,
  "ordinary trainer cell must not be consumed merely by entering Battle");

const activeIndex = Number(resumedState.battle.player_party_index ?? 0);
const continuedPlayer = resumed.player.party[activeIndex];
assert.equal(continuedPlayer.personal_id, 326001,
  "the same continued Pokemon must be the active combatant in the first Battle after Continue");
continuedPlayer.hp = 999999;
continuedPlayer.max_hp = 999999;
continuedPlayer.stats = {
  ...(continuedPlayer.stats ?? {}),
  DEFENSE: 9999,
  SPECIAL_DEFENSE: 9999,
  SPEED: 9999,
};
const foeIndex = Number(resumedState.battle.trainer_party_index ?? 0);
resumedState.battle.foe.hp = 999999;
resumedState.battle.foe.max_hp = 999999;
resumedState.battle.foe.stats = {
  ...(resumedState.battle.foe.stats ?? {}),
  DEFENSE: 9999,
  SPECIAL_DEFENSE: 9999,
  SPEED: 1,
};
if (Array.isArray(resumedState.battle.trainer_party) && resumedState.battle.trainer_party[foeIndex]) {
  resumedState.battle.trainer_party[foeIndex] = structuredClone(resumedState.battle.foe);
}

const continuedMoveId = moveId(continuedPlayer.moves.find((move) => moveId(move) && (typeof move === "string" || Number(move.pp ?? 0) > 0)));
assert.ok(continuedMoveId, "continued active Pokemon must have a usable move");
const continuedPlayerPpBefore = movePp(continuedPlayer, continuedMoveId);
const continuedFoeBefore = structuredClone(resumedState.battle.foe);
const continuedTurnBefore = Number(resumedState.battle.turn ?? 1);
const continuedRound = await web.resolveSafariBattleRound(resumed, continuedMoveId);
assert.equal(Number(resumedState.battle?.turn), continuedTurnBefore + 1,
  "first command after fresh Continue must advance exactly one ordinary Battle turn");
assert.equal(Number(continuedRound.decision), 0,
  "high-HP continued fixture must remain in Battle after exactly one command");
assert.equal(resumedState.board_consumed[trainerIndex], false,
  "nonterminal first Battle turn after Continue must not consume the trainer cell");
assert.equal(resumed.player.party[activeIndex].personal_id, 326001,
  "first post-Continue Battle turn must preserve active Pokemon identity");
if (continuedPlayerPpBefore !== null) {
  assert.equal(movePp(resumed.player.party[activeIndex], continuedMoveId), continuedPlayerPpBefore - 1,
    "first post-Continue selected move must consume player PP exactly once");
}
if (continuedRound.opponentChoice?.command === "move" && continuedRound.opponentChoice.moveId) {
  const foeMove = continuedRound.opponentChoice.moveId;
  const foePpBefore = movePp(continuedFoeBefore, foeMove);
  const foePpAfter = movePp(resumedState.battle.foe, foeMove);
  if (foePpBefore !== null && foePpAfter !== null) {
    assert.equal(foePpAfter, foePpBefore - 1,
      "first post-Continue trainer response must consume foe PP exactly once");
  }
}

console.log("Safari wild turn -> flee -> save -> fresh Continue -> first ordinary trainer turn continuity: ok");
