import assert from "node:assert/strict";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const webPlayable = await import("../runtime/safari-web-playable-integration.js");

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

const runtime = webPlayable.createSafariPlayableRuntime();
const state = runtime.variables.mapless;
state.board_events[0] = { kind: "wild", type: "BUG", slot: 0 };
state.board_revealed[0] = true;
state.board_consumed[0] = false;
state.board_visited[0] = false;
state.battle = null;
state.location = "day_board";

const started = await webPlayable.activateSafariDayBoardCell(runtime, 0);
assert.equal(started.result, "dispatched", "wild Board cell must dispatch");
assert.ok(state.battle && !state.battle.completed, "wild Battle must start");

const playerIndex = Number(state.battle.player_party_index ?? 0);
const player = runtime.player.party[playerIndex];
const selectedMoveId = moveId(player.moves?.[0]);
assert.ok(selectedMoveId, "wild Battle must expose a player move");

// This regression owns continuity only. It deliberately does not invent a move
// effect/status-infliction rule; canonical Battle Systems remains the mutation owner.
player.status = "POISON";
player.status_count = 2;
player.max_hp = Math.max(500, Number(player.max_hp ?? 1));
player.hp = player.max_hp;
player.stats.ATTACK = 1;
player.stats.SPECIAL_ATTACK = 1;
player.stats.DEFENSE = 999;
player.stats.SPECIAL_DEFENSE = 999;
player.stats.SPEED = 999;
state.battle.foe.max_hp = Math.max(500, Number(state.battle.foe.max_hp ?? 1));
state.battle.foe.hp = state.battle.foe.max_hp;
state.battle.foe.stats.ATTACK = 1;
state.battle.foe.stats.SPECIAL_ATTACK = 1;
state.battle.foe.stats.DEFENSE = 999;
state.battle.foe.stats.SPECIAL_DEFENSE = 999;
state.battle.foe.stats.SPEED = 1;

const firstTurn = Number(state.battle.turn ?? 1);
const first = await webPlayable.resolveSafariBattleRound(runtime, selectedMoveId);
assert.equal(first.decision, 0, "durable status-continuity turn must remain nonterminal");
assert.equal(Number(state.battle.turn), firstTurn + 1, "status continuity must not alter one-input-one-turn ownership");
assert.equal(runtime.player.party[playerIndex].status, "POISON", "ordinary Battle round must retain active Pokemon major status");
assert.equal(Number(runtime.player.party[playerIndex].status_count), 2, "ordinary Battle round must retain status_count when no canonical cure/mutation request fires");

runtime.player.party[playerIndex].stats.ATTACK = 999;
runtime.player.party[playerIndex].stats.SPECIAL_ATTACK = 999;
state.battle.foe.hp = 1;
const terminal = await webPlayable.resolveSafariBattleRound(runtime, selectedMoveId);
assert.equal(terminal.decision, 1, "terminal status-continuity turn must resolve as victory");
assert.equal(runtime.player.party[playerIndex].status, "POISON", "terminal Battle reflection must retain major status without a canonical cure request");
assert.equal(Number(runtime.player.party[playerIndex].status_count), 2, "terminal Battle reflection must retain status_count without a canonical cure request");
assert.equal(state.board_consumed[0], true, "terminal victory must still consume the Board cell");

const returned = await webPlayable.returnSafariToDayBoard(runtime);
assert.equal(returned.result, "returned", "completed status-continuity Battle must return to Day Board");
assert.equal(state.battle, null, "Battle return must clear Battle state");
assert.equal(runtime.player.party[playerIndex].status, "POISON", "post-Battle Party must retain owner-backed status");
assert.equal(Number(runtime.player.party[playerIndex].status_count), 2, "post-Battle Party must retain owner-backed status_count");

console.log("Safari Battle status continuity: nonterminal turn + terminal reflection + Board return: ok");
