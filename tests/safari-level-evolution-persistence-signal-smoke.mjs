import assert from "node:assert/strict";

import {
  SAFARI_BATTLE_PHASE,
  beginSafariBattleCommand,
  commitSafariBattleResolution,
} from "../runtime/safari-battle-orchestrator.js";

function battleRuntime() {
  return {
    variables: {
      mapless: {
        battle: {
          turn: 7,
          completed: false,
          phase: null,
          phase_trace: [],
        },
      },
    },
  };
}

const runtime = battleRuntime();
beginSafariBattleCommand(runtime, "move");
const terminalGrowth = {
  decision: 1,
  persistenceRequested: false,
  operations: [
    { op: "gain_exp", battler: 0, amount: 1000 },
    { op: "level_up", battler: 0, from: 10, to: 11 },
    { op: "replace_move", battler: 0, level: 11, move: "GROWL", forgetIndex: 0 },
    { op: "level_up", battler: 0, from: 11, to: 12 },
    { op: "replace_move", battler: 0, level: 12, move: "VINEWHIP", forgetIndex: 1 },
    { op: "level_evolution", battler: 0, from: "BULBASAUR", to: "IVYSAUR", method: "Level", parameter: 12 },
    { op: "request_save", reason: "normal battle resolved" },
  ],
};

commitSafariBattleResolution(runtime, terminalGrowth, "move");

assert.equal(terminalGrowth.phase, SAFARI_BATTLE_PHASE.RESULT);
assert.equal(runtime.variables.mapless.battle.completed, true);
assert.equal(
  terminalGrowth.persistenceRequested,
  true,
  "terminal growth/evolution result must surface the request_save operation to the real Safari owner",
);
assert.deepEqual(
  terminalGrowth.phaseTrace.slice(-3).map((entry) => entry.phase),
  [SAFARI_BATTLE_PHASE.POST_VICTORY, SAFARI_BATTLE_PHASE.REWARD_GROWTH, SAFARI_BATTLE_PHASE.RESULT],
);

// Compatibility replay must preserve the already-committed save request as well.
const replay = {
  decision: 1,
  persistenceRequested: false,
  operations: structuredClone(terminalGrowth.operations),
};
commitSafariBattleResolution(runtime, replay, "move");
assert.equal(replay.phase, SAFARI_BATTLE_PHASE.RESULT);
assert.equal(replay.persistenceRequested, true);

const nonterminal = battleRuntime();
beginSafariBattleCommand(nonterminal, "move");
const ordinaryRound = {
  decision: 0,
  persistenceRequested: false,
  operations: [{ op: "use_move", actor: 0, move: "TACKLE" }],
};
commitSafariBattleResolution(nonterminal, ordinaryRound, "move");
assert.equal(ordinaryRound.phase, SAFARI_BATTLE_PHASE.COMMAND);
assert.equal(ordinaryRound.persistenceRequested, false);

console.log("safari-level-evolution-persistence-signal-smoke: PASS");
