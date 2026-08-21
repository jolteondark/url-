import assert from "node:assert/strict";
import {
  SAFARI_BATTLE_PHASE,
  beginSafariBattleCommand,
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

beginSafariBattleCommand(state, "move");
const firstResolution = {
  decision: 0,
  operations: [
    { op: "use_move", actor: "player", target: "foe" },
    { op: "use_move", actor: "foe", target: "player" },
  ],
};
const first = commitSafariBattleResolution(state, firstResolution, "move");
assert.equal(first.orchestratorCommandSequence, 1,
  "the central orchestrator must stamp the resolved result with the command sequence it consumed");
assert.equal(battle.phase, SAFARI_BATTLE_PHASE.COMMAND);

beginSafariBattleCommand(state, "move");
assert.equal(battle.command_sequence, 2);
assert.equal(battle.phase, SAFARI_BATTLE_PHASE.ACTION_1);
const traceLengthBeforeStaleReplay = battle.phase_trace.length;

assert.throws(
  () => commitSafariBattleResolution(state, structuredClone(firstResolution), "move"),
  /stale battle resolution belongs to command sequence 1; current command sequence is 2/,
  "a delayed compatibility replay from the previous COMMAND must not be accepted as the next command resolution",
);
assert.equal(battle.phase, SAFARI_BATTLE_PHASE.ACTION_1,
  "rejecting a stale resolution must leave the current command waiting for its own mechanics result");
assert.equal(battle.phase_trace.length, traceLengthBeforeStaleReplay,
  "rejecting a stale resolution must not materialize CHECK/ACTION phases for the current command");
assert.equal(battle.resolution_checkpoint?.sequence, 1,
  "the committed checkpoint from the previous command must remain intact until the current resolution is accepted");

const secondResolution = {
  decision: 0,
  operations: [
    { op: "use_move", actor: "foe", target: "player" },
    { op: "use_move", actor: "player", target: "foe" },
  ],
};
const second = commitSafariBattleResolution(state, secondResolution, "move");
assert.equal(second.orchestratorCommandSequence, 2);
assert.equal(battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
assert.equal(battle.resolution_checkpoint.sequence, 2);
assert.equal(battle.resolution_checkpoint.committed, true);

console.log("Safari Battle stale resolution sequence smoke passed");
