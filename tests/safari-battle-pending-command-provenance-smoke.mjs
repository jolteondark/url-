import assert from "node:assert/strict";
import {
  SAFARI_BATTLE_PHASE,
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
assert.equal(battle.phase, SAFARI_BATTLE_PHASE.COMMAND);

// Compatibility code must not be able to impersonate beginSafariBattleCommand
// by writing ACTION_1 directly. A fresh resolution is valid only when the
// central COMMAND owner issued the pending command identity.
battle.phase = SAFARI_BATTLE_PHASE.ACTION_1;
const traceBefore = structuredClone(battle.phase_trace);
const resolution = {
  decision: 0,
  operations: [
    { op: "use_move", actor: "player", target: "foe" },
    { op: "use_move", actor: "foe", target: "player" },
  ],
};

assert.throws(
  () => commitSafariBattleResolution(state, resolution, "move"),
  /fresh battle resolution requires a centrally issued pending command/,
  "ACTION_1 alone must not be accepted as proof that COMMAND was centrally consumed",
);
assert.equal(battle.phase, SAFARI_BATTLE_PHASE.ACTION_1,
  "rejecting forged ACTION_1 provenance must not advance CHECK/action phases");
assert.deepEqual(battle.phase_trace, traceBefore,
  "rejecting forged ACTION_1 provenance must leave the central trace untouched");
assert.equal(battle.resolution_checkpoint ?? null, null,
  "a rejected resolution must not create an exactly-once checkpoint");
assert.equal(resolution.orchestratorCommandSequence ?? null, null,
  "a rejected result must not be stamped with a command identity it never consumed");

console.log("Safari Battle pending command provenance smoke passed");
