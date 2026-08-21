import assert from "node:assert/strict";
import {
  SAFARI_BATTLE_PHASE,
  ensureSafariBattleOrchestrator,
  safariBattleCommandAllowed,
} from "../runtime/safari-battle-orchestrator.js";

function runtime(battle) {
  return {
    variables: {
      mapless: { battle },
    },
  };
}

{
  const state = runtime({
    turn: 4,
    decision: 0,
    completed: true,
  });
  assert.throws(
    () => ensureSafariBattleOrchestrator(state),
    /cannot initialize RESULT without a recorded RESULT boundary/,
    "legacy completed=true must not synthesize RESULT when the central RESULT boundary was never recorded",
  );
  assert.equal(state.variables.mapless.battle.phase ?? null, null);
  assert.equal(state.variables.mapless.battle.phase_trace ?? null, null);
}

{
  const state = runtime({
    turn: 4,
    decision: 1,
    completed: true,
    completed_phase: SAFARI_BATTLE_PHASE.RESULT,
  });
  assert.equal(ensureSafariBattleOrchestrator(state), SAFARI_BATTLE_PHASE.RESULT,
    "a saved terminal battle with completed_phase=RESULT must restore at RESULT");
  assert.equal(safariBattleCommandAllowed(state), false,
    "a restored RESULT must not accept another Battle command");
  assert.equal(state.variables.mapless.battle.phase_trace.at(-1)?.phase, SAFARI_BATTLE_PHASE.RESULT);
}

{
  const state = runtime({
    turn: 4,
    decision: 1,
    completed: true,
    phase_trace: [
      { phase: SAFARI_BATTLE_PHASE.POST_VICTORY, turn: 4, completed: false },
      { phase: SAFARI_BATTLE_PHASE.REWARD_GROWTH, turn: 4, completed: false },
      { phase: SAFARI_BATTLE_PHASE.RESULT, turn: 4, completed: true },
    ],
  });
  assert.equal(ensureSafariBattleOrchestrator(state), SAFARI_BATTLE_PHASE.RESULT,
    "saved RESULT phase trace is valid central evidence for older RESULT saves without completed_phase metadata");
}

console.log("Safari Battle RESULT restore truth smoke passed");
