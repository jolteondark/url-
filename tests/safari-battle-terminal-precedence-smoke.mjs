import assert from "node:assert/strict";
import {
  SAFARI_BATTLE_PHASE,
  beginSafariBattleCommand,
  commitSafariBattleResolution,
  ensureSafariBattleOrchestrator,
} from "../runtime/safari-battle-orchestrator.js";

const runtime = {
  variables: {
    mapless: {
      battle: {
        turn: 7,
        decision: 0,
        completed: false,
        player_replacement_required: true,
      },
    },
  },
};

ensureSafariBattleOrchestrator(runtime);
beginSafariBattleCommand(runtime, "move");
const result = commitSafariBattleResolution(runtime, {
  decision: 2,
  playerReplacementRequired: true,
  operations: [
    { op: "use_move", actor: "foe" },
    { op: "faint", target: "player" },
  ],
}, "move");

const battle = runtime.variables.mapless.battle;
const phases = battle.phase_trace.map((entry) => entry.phase);
assert.equal(result.phase, SAFARI_BATTLE_PHASE.RESULT);
assert.equal(battle.completed, true);
assert.equal(battle.completed_phase, SAFARI_BATTLE_PHASE.RESULT);
assert.equal(phases.includes(SAFARI_BATTLE_PHASE.REPLACEMENT), false,
  "terminal all-fainted loss must not enter REPLACEMENT even if a compatibility result carries a stale replacement flag");
assert.deepEqual(phases.slice(-4), [
  SAFARI_BATTLE_PHASE.POST_FAINT,
  SAFARI_BATTLE_PHASE.POST_VICTORY,
  SAFARI_BATTLE_PHASE.REWARD_GROWTH,
  SAFARI_BATTLE_PHASE.RESULT,
], "all-fainted terminal must follow POST_FAINT -> POST_VICTORY -> REWARD_GROWTH -> RESULT");

console.log("safari battle terminal precedence smoke: PASS");
