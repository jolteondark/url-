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

const terminal = {
  decision: 1,
  operations: [
    { op: "use_move", actor: "player", target: "foe" },
    { op: "faint", actor: "player", target: "foe" },
    { op: "request_save", reason: "terminal result" },
  ],
};

const committed = commitSafariBattleResolution(state, terminal, "move");
assert.equal(battle.phase, SAFARI_BATTLE_PHASE.RESULT);
assert.equal(battle.completed, true);
assert.equal(Number.isInteger(committed.orchestratorCommandSequence), true);
const traceLength = battle.phase_trace.length;

const replay = commitSafariBattleResolution(state, structuredClone(committed), "move");
assert.equal(replay.phase, SAFARI_BATTLE_PHASE.RESULT);
assert.equal(battle.phase_trace.length, traceLength,
  "a tagged replay of the committed terminal resolution must remain exactly-once at RESULT");

const unrelatedTerminal = {
  decision: 1,
  operations: [{ op: "request_save", reason: "unrelated terminal result" }],
};
assert.throws(
  () => commitSafariBattleResolution(state, unrelatedTerminal, "move"),
  /RESULT battle resolution replay requires committed command identity/,
  "RESULT must not accept an untagged terminal-shaped result as a compatibility replay",
);
assert.equal(unrelatedTerminal.orchestratorCommandSequence ?? null, null,
  "rejected RESULT replays must not be mutated into the committed command identity");
assert.equal(battle.phase_trace.length, traceLength,
  "rejected RESULT replays must not append phases or re-run terminal lifecycle work");

const staleTerminal = {
  ...structuredClone(committed),
  orchestratorCommandSequence: committed.orchestratorCommandSequence + 1,
};
assert.throws(
  () => commitSafariBattleResolution(state, staleTerminal, "move"),
  /RESULT battle resolution replay requires committed command identity/,
  "RESULT must reject a terminal replay tagged for another command sequence",
);
assert.equal(battle.phase_trace.length, traceLength);

console.log("Safari Battle RESULT replay identity smoke passed");
