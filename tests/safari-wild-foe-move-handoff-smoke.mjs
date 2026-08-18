import assert from "node:assert/strict";

globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = { dispatchEvent() { return true; } };

const web = await import("../runtime/safari-web-playable-integration.js");

function moveId(move) {
  return typeof move === "string" ? move : move?.id;
}

const runtime = web.createSafariPlayableRuntime();
const state = runtime.variables.mapless;
state.board_events[0] = { kind: "wild", type: "BUG", slot: 0 };
state.board_revealed[0] = true;
state.board_consumed[0] = false;
state.board_visited[0] = false;

const started = await web.activateSafariDayBoardCell(runtime, 0);
assert.equal(started.result, "dispatched");
assert.ok(state.battle?.foe, "wild Battle must materialize a foe");

const foeMovesBefore = state.battle.foe.moves.map(moveId);
assert.ok(foeMovesBefore.length > 0, "wild foe must know at least one move");
const selectedMoveId = moveId(runtime.player.party[0].moves[0]);
assert.ok(selectedMoveId, "player must have a selectable move");

const round = await web.resolveSafariBattleRound(runtime, selectedMoveId);
assert.ok(round.opponentChoice, "wild round must expose the canonical opponent choice");
if (round.opponentChoice.command === "move") {
  assert.ok(round.opponentChoice.moveId, "canonical opponent move choice must expose moveId");
  assert.ok(
    foeMovesBefore.includes(round.opponentChoice.moveId),
    `chosen foe move ${round.opponentChoice.moveId} must be known by the foe Pokemon`,
  );
}

console.log("Safari wild opponent AI moveId -> foe known move -> round handoff: ok");
