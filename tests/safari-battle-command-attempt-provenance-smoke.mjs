import assert from "node:assert/strict";
import {
  SAFARI_BATTLE_PHASE,
  beginSafariBattleCommand,
  captureSafariBattleCommandAttempt,
  commitSafariBattleResolution,
  ensureSafariBattleOrchestrator,
} from "../runtime/safari-battle-orchestrator.js";

function runtime() {
  return {
    variables: {
      mapless: {
        battle: {
          turn: 1,
          decision: 0,
          completed: false,
        },
      },
    },
  };
}

const state = runtime();
const battle = state.variables.mapless.battle;
ensureSafariBattleOrchestrator(state);

beginSafariBattleCommand(state, "item");
const firstAttempt = captureSafariBattleCommandAttempt(state);
const firstUnconsumed = {
  decision: 0,
  turnConsumed: false,
  operations: [],
};
commitSafariBattleResolution(state, firstUnconsumed, "item", { commandAttempt: firstAttempt });
assert.equal(battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
assert.equal(firstUnconsumed.orchestratorBattleInstanceSequence ?? null, null,
  "an unconsumed command must stay outside committed resolution identity");
assert.equal(firstUnconsumed.orchestratorCommandSequence ?? null, null,
  "an unconsumed command must stay untagged after central rollback");
assert.equal(battle.resolution_checkpoint ?? null, null,
  "an unconsumed command must not create a resolution checkpoint");

beginSafariBattleCommand(state, "item");
const secondAttempt = captureSafariBattleCommandAttempt(state);
const traceLength = battle.phase_trace.length;
const delayedFirstDuplicate = {
  decision: 0,
  turnConsumed: false,
  operations: [],
};
assert.throws(
  () => commitSafariBattleResolution(state, delayedFirstDuplicate, "item", { commandAttempt: firstAttempt }),
  /stale battle command attempt belongs to command sequence 1; current command sequence is 2/,
  "a delayed untagged result from the previous unconsumed command must not roll back the current command",
);
assert.equal(battle.phase, SAFARI_BATTLE_PHASE.ACTION_1,
  "a stale attempt must leave the current command pending");
assert.equal(battle.phase_trace.length, traceLength,
  "a stale attempt must not append COMMAND or CHECK phases");

assert.throws(
  () => commitSafariBattleResolution(state, {
    decision: 0,
    turnConsumed: false,
    operations: [],
  }, "item"),
  /requires a command attempt token issued by the central orchestrator/,
  "once a production command captures central provenance, an untagged compatibility result cannot impersonate it",
);
assert.equal(battle.phase, SAFARI_BATTLE_PHASE.ACTION_1);
assert.equal(battle.phase_trace.length, traceLength);

const secondUnconsumed = {
  decision: 0,
  turnConsumed: false,
  operations: [],
};
commitSafariBattleResolution(state, secondUnconsumed, "item", { commandAttempt: secondAttempt });
assert.equal(battle.phase, SAFARI_BATTLE_PHASE.COMMAND,
  "the current command's own centrally issued attempt token must still allow normal unconsumed rollback");
assert.equal(secondUnconsumed.orchestratorBattleInstanceSequence ?? null, null);
assert.equal(secondUnconsumed.orchestratorCommandSequence ?? null, null);

console.log("Safari Battle command-attempt provenance smoke: PASS");
