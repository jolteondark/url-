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

const struggleRuntime = createSafariPlayableRuntime();
const struggleState = struggleRuntime.variables.mapless;
const struggleTrainerIndex = struggleState.board_events.findIndex((event) => event?.kind === "trainer");
assert.notEqual(struggleTrainerIndex, -1);
activateSafariDayBoardCell(struggleRuntime, struggleTrainerIndex);
assert.equal(struggleState.battle?.kind, "trainer");
assert.ok(struggleState.battle.foe.moves.length > 0);
for (const move of struggleState.battle.foe.moves) {
  assert.equal(typeof move, "object", "trainer battle moves must be materialized before PP ownership");
  move.pp = 0;
}
const strugglePlayerMoveId = moveId(struggleRuntime.player.party[0].moves[0]);
const struggleResult = resolveSafariBattleRound(struggleRuntime, strugglePlayerMoveId);
assert.equal(struggleResult.trainerAi?.command, "struggle");
assert.equal(struggleResult.trainerAi?.selectedMoveId, "STRUGGLE");
assert.equal(struggleResult.trainerAi?.reason, "all_moves_out_of_pp");
assert.equal(struggleResult.struggle?.foe, true, "Battle round owner must execute foe Struggle rather than Safari inventing a fallback move");

console.log("Safari trainer AI smoke: PASS", {
  selectedMoveId: result.trainerAi.selectedMoveId,
  choiceCount: result.trainerAi.choices.length,
  allPpOutCommand: struggleResult.trainerAi.command,
});
