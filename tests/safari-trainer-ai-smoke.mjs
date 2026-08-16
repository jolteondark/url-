import assert from "node:assert/strict";
import {
  activateSafariDayBoardCell,
  createSafariPlayableRuntime,
  resolveSafariBattleRound,
} from "../runtime/safari-playable-integration-ai.js";

const moveId = (move) => typeof move === "string" ? move : move.id;

const runtime = createSafariPlayableRuntime();
const state = runtime.variables.mapless;
const trainerIndex = state.board_events.findIndex((event) => event?.kind === "trainer");
assert.notEqual(trainerIndex, -1, "generated Day Board should contain a trainer cell");

activateSafariDayBoardCell(runtime, trainerIndex);
assert.equal(state.battle?.kind, "trainer");
const originalFoeMoves = state.battle.foe.moves.map(moveId);
assert.ok(originalFoeMoves.length > 0);

const playerMoveId = moveId(runtime.player.party[0].moves[0]);
const result = resolveSafariBattleRound(runtime, playerMoveId);
assert.equal(result.trainerAi?.command, "move");
assert.ok(originalFoeMoves.includes(result.trainerAi.selectedMoveId));
assert.ok(Array.isArray(result.trainerAi.choices));
assert.ok(result.trainerAi.choices.length > 0);

if (state.battle?.kind === "trainer" && state.battle.trainer_party_index === 0) {
  assert.deepEqual(state.battle.foe.moves.map(moveId), originalFoeMoves, "temporary AI lead-move reorder must not leak into persistent move order");
}

console.log("Safari trainer AI smoke: PASS", {
  selectedMoveId: result.trainerAi.selectedMoveId,
  choiceCount: result.trainerAi.choices.length,
});
