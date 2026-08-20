import assert from "node:assert/strict";
import { resolveExpLevelMoveFlow } from "../runtime/battle-exp-level-move-flow.js";

const baseInput = {
  pokemon: {
    exp: 1000,
    level: 10,
    moves: ["MOVE_A", "MOVE_B", "MOVE_C", "MOVE_D"],
  },
  maximumExp: 100000,
  levelThresholds: { 11: 2000 },
  movesByLevel: { 11: ["MOVE_E", "MOVE_E"] },
  maxMoves: 4,
  expContext: {
    defeatedLevel: 10,
    baseExp: 700,
    numParticipants: 1,
    expShareCount: 0,
    participant: true,
    hasExpShare: false,
    expAll: false,
    splitExpBetweenGainers: false,
    moreExpFromTrainerPokemon: false,
    trainerBattle: false,
    scaledExpFormula: false,
  },
};

{
  const result = resolveExpLevelMoveFlow({
    ...baseInput,
    moveDecisions: {
      "11:MOVE_E:1": { decline: true },
      "11:MOVE_E:2": { forgetIndex: 1 },
    },
  });

  assert.equal(result.result, "awarded");
  assert.equal(result.pokemon.level, 11);
  assert.deepEqual(result.pokemon.moves, ["MOVE_A", "MOVE_E", "MOVE_C", "MOVE_D"]);
  const moveOps = result.operations.filter((entry) => ["decline_move", "replace_move"].includes(entry.op));
  assert.deepEqual(moveOps, [
    { op: "decline_move", move: "MOVE_E" },
    { op: "replace_move", slot: 1, forgotten: "MOVE_B", move: "MOVE_E", resetPp: true },
  ]);
}

{
  const seenOccurrences = [];
  const result = resolveExpLevelMoveFlow({
    ...baseInput,
    moveDecisionResolver({ occurrence }) {
      seenOccurrences.push(occurrence);
      return occurrence === 1 ? { decline: true } : { forgetIndex: 2 };
    },
  });

  assert.deepEqual(seenOccurrences, [1, 2]);
  assert.deepEqual(result.pokemon.moves, ["MOVE_A", "MOVE_B", "MOVE_E", "MOVE_D"]);
}

{
  const result = resolveExpLevelMoveFlow({
    ...baseInput,
    moveDecisions: {
      "11:MOVE_E": { decline: true },
    },
  });

  assert.equal(result.operations.filter((entry) => entry.op === "decline_move" && entry.move === "MOVE_E").length, 2);
  assert.deepEqual(result.pokemon.moves, baseInput.pokemon.moves);
}

console.log("core level-move duplicate occurrence smoke: PASS");
