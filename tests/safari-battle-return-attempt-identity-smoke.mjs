import assert from "node:assert/strict";

import {
  SAFARI_BATTLE_PHASE,
  abortSafariBattleReturn,
  beginSafariBattleReturn,
  captureSafariBattleReturnAttempt,
  completeSafariBattleReturn,
  ensureSafariBattleOrchestrator,
} from "../runtime/safari-battle-orchestrator.js";

function runtime() {
  return {
    variables: {
      mapless: {
        battle: {
          turn: 4,
          decision: 1,
          completed: true,
          completed_phase: SAFARI_BATTLE_PHASE.RESULT,
          phase: SAFARI_BATTLE_PHASE.RESULT,
          phase_trace: [{ phase: SAFARI_BATTLE_PHASE.RESULT, turn: 4, completed: true }],
        },
        last_operations: [],
      },
    },
  };
}

const state = runtime();
const battle = state.variables.mapless.battle;
ensureSafariBattleOrchestrator(state);

beginSafariBattleReturn(state);
const attemptOne = captureSafariBattleReturnAttempt(state);
const firstCheckpoint = state.variables.mapless.pending_battle_return_checkpoint;
assert.equal(battle.phase, SAFARI_BATTLE_PHASE.RETURN);

abortSafariBattleReturn(state, "first return cancelled", { returnAttempt: attemptOne });
assert.equal(battle.phase, SAFARI_BATTLE_PHASE.RESULT);
assert.equal(state.variables.mapless.pending_battle_return_checkpoint, null);

beginSafariBattleReturn(state);
const attemptTwo = captureSafariBattleReturnAttempt(state);
const secondCheckpoint = state.variables.mapless.pending_battle_return_checkpoint;
assert.notEqual(secondCheckpoint, firstCheckpoint);

assert.throws(
  () => abortSafariBattleReturn(state, "stale first return", { returnAttempt: attemptOne }),
  /stale battle return attempt|different return checkpoint/,
  "an old RETURN abort must not cancel the current RETURN attempt",
);
assert.equal(battle.phase, SAFARI_BATTLE_PHASE.RETURN);
assert.equal(state.variables.mapless.pending_battle_return_checkpoint, secondCheckpoint);

abortSafariBattleReturn(state, "second return cancelled", { returnAttempt: attemptTwo });
assert.equal(battle.phase, SAFARI_BATTLE_PHASE.RESULT);

beginSafariBattleReturn(state);
const attemptThree = captureSafariBattleReturnAttempt(state);
const thirdCheckpoint = state.variables.mapless.pending_battle_return_checkpoint;
state.variables.mapless.battle = null;

assert.throws(
  () => completeSafariBattleReturn(state, { operations: [{ op: "stale_return" }] }, { returnAttempt: attemptTwo }),
  /stale battle return attempt|different return checkpoint/,
  "an old RETURN completion must not commit the current cleared-state RETURN",
);
assert.equal(state.variables.mapless.pending_battle_return_checkpoint, thirdCheckpoint);
assert.equal(state.variables.mapless.battle_return_checkpoint ?? null, null);

const completed = completeSafariBattleReturn(
  state,
  { operations: [{ op: "return_to_day_board" }] },
  { returnAttempt: attemptThree },
);
assert.equal(completed.phase, SAFARI_BATTLE_PHASE.RETURN);
assert.equal(completed.operations.filter((operation) => operation?.op === "request_save").length, 1);
assert.equal(state.variables.mapless.pending_battle_return_checkpoint, null);
assert.equal(state.variables.mapless.battle_return_checkpoint?.committed, true);

const replay = completeSafariBattleReturn(state, { operations: [{ op: "forged_replay" }] }, { returnAttempt: attemptThree });
assert.deepEqual(replay.operations, completed.operations,
  "committed RETURN replay must keep the first central operations snapshot");
assert.equal(replay.operations.some((operation) => operation?.op === "forged_replay"), false);

console.log("Safari Battle RETURN attempt identity smoke: PASS");
