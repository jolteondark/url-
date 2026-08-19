import assert from "node:assert/strict";
import { attemptSafariFlee } from "../runtime/safari-flee-command.js";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const web = await import("../runtime/safari-web-playable-integration.js");

async function startWild() {
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
  const player = runtime.player.party[playerIndex];
  player.max_hp = Math.max(500, Number(player.max_hp ?? 1));
  player.hp = player.max_hp;
  player.stats.DEFENSE = 999;
  player.stats.SPECIAL_DEFENSE = 999;
  state.battle.foe.stats.ATTACK = 1;
  state.battle.foe.stats.SPECIAL_ATTACK = 1;
  return { runtime, state, playerIndex };
}

function foeMoveCommitCount(response) {
  return (response?.ppIntegration?.commits ?? []).filter((commit) => commit.actor === "foe").length;
}

function foeMoveOperationCount(response) {
  return (response?.operations ?? []).filter((operation) => operation.op === "use_move" && operation.actor === "foe").length;
}

function foeMovePresentationCount(presentation) {
  return (presentation ?? []).filter((event) => event.type === "move_started" && event.actor === "foe").length;
}

function assertFoeResponse(label, result, expectedActions) {
  assert.ok(result.opponentResponse, `${label} must expose the shared opponent-response result`);
  assert.equal(foeMoveCommitCount(result.opponentResponse), expectedActions, `${label}: foe PP commit count`);
  assert.equal(foeMoveOperationCount(result.opponentResponse), expectedActions, `${label}: foe use_move operation count`);
  assert.equal(foeMovePresentationCount(result.presentation), expectedActions, `${label}: foe presentation action count`);
}

const trace = [];

// Battle Potion consumes the player action. A living foe responds exactly once.
{
  const { runtime, state, playerIndex } = await startWild();
  runtime.bag.slots = [["POTION", 1]];
  const player = runtime.player.party[playerIndex];
  player.hp = player.max_hp - 40;
  const turnBefore = Number(state.battle.turn ?? 1);
  const result = await web.useSafariBattleItem(runtime, { itemId: "POTION", partyIndex: playerIndex });
  assert.equal(result.turnConsumed, true);
  assert.equal(Number(state.battle.turn), turnBefore + 1);
  assert.equal(result.presentation?.[0]?.type, "battle_item");
  assertFoeResponse("living foe after Potion", result, 1);
  trace.push({ command: "potion", foe: "living", turnBefore, turnAfter: Number(state.battle.turn), presentation: result.presentation.map((event) => [event.type, event.actor ?? null]) });
}

// If the foe is already fainted, the same consumed Potion action must not synthesize a foe action.
{
  const { runtime, state, playerIndex } = await startWild();
  runtime.bag.slots = [["POTION", 1]];
  const player = runtime.player.party[playerIndex];
  player.hp = player.max_hp - 40;
  state.battle.foe.hp = 0;
  const result = await web.useSafariBattleItem(runtime, { itemId: "POTION", partyIndex: playerIndex });
  assert.equal(result.turnConsumed, true);
  assert.equal(result.presentation?.[0]?.type, "battle_item");
  assertFoeResponse("fainted foe after Potion", result, 0);
  trace.push({ command: "potion", foe: "fainted", presentation: result.presentation.map((event) => [event.type, event.actor ?? null]) });
}

// Failed capture consumes the player action. A living foe responds exactly once.
{
  const { runtime, state } = await startWild();
  const turnBefore = Number(state.battle.turn ?? 1);
  const result = await web.attemptSafariCapture(runtime, { captureRandomSeed: 1, randomValues: [65535, 65535, 65535, 65535] });
  assert.notEqual(result.result, "caught");
  assert.equal(Number(state.battle.turn), turnBefore + 1);
  assert.equal(result.presentation?.[0]?.type, "capture");
  assertFoeResponse("living foe after capture", result, 1);
  trace.push({ command: "capture", foe: "living", turnBefore, turnAfter: Number(state.battle.turn), presentation: result.presentation.map((event) => [event.type, event.actor ?? null]) });
}

// Capture targeting an already-fainted foe must not permit a post-command foe action.
{
  const { runtime, state } = await startWild();
  state.battle.foe.hp = 0;
  const result = await web.attemptSafariCapture(runtime, { captureRandomSeed: 1, randomValues: [65535, 65535, 65535, 65535] });
  assert.notEqual(result.result, "caught");
  assert.equal(result.presentation?.[0]?.type, "capture");
  assertFoeResponse("fainted foe after capture", result, 0);
  trace.push({ command: "capture", foe: "fainted", presentation: result.presentation.map((event) => [event.type, event.actor ?? null]) });
}

// Failed flee consumes the player action. A living foe responds exactly once.
{
  const { runtime, state, playerIndex } = await startWild();
  runtime.player.party[playerIndex].stats.SPEED = 1;
  state.battle.foe.stats.SPEED = 999;
  const turnBefore = Number(state.battle.turn ?? 1);
  const result = attemptSafariFlee(runtime, { runRandomSeed: 1, randomRoll: 255 });
  assert.equal(result.escaped, false);
  assert.equal(result.blocked, false);
  assert.equal(result.resolution.reason, "escape_failed");
  assert.equal(Number(state.battle.turn), turnBefore + 1);
  assert.equal(result.presentation?.[0]?.type, "flee");
  assertFoeResponse("living foe after flee", result, 1);
  trace.push({ command: "flee", foe: "living", turnBefore, turnAfter: Number(state.battle.turn), presentation: result.presentation.map((event) => [event.type, event.actor ?? null]) });
}

// A failed flee against an already-fainted foe must consume no foe PP/action/narration.
{
  const { runtime, state, playerIndex } = await startWild();
  runtime.player.party[playerIndex].stats.SPEED = 1;
  state.battle.foe.stats.SPEED = 999;
  state.battle.foe.hp = 0;
  const result = attemptSafariFlee(runtime, { runRandomSeed: 1, randomRoll: 255 });
  assert.equal(result.escaped, false);
  assert.equal(result.blocked, false);
  assert.equal(result.resolution.reason, "escape_failed");
  assert.equal(result.presentation?.[0]?.type, "flee");
  assertFoeResponse("fainted foe after flee", result, 0);
  trace.push({ command: "flee", foe: "fainted", presentation: result.presentation.map((event) => [event.type, event.actor ?? null]) });
}

console.log("Safari consumed player actions -> living foe exactly once / fainted foe zero action:", JSON.stringify(trace));
