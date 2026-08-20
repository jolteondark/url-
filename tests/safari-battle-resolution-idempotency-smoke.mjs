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
          turn: 2,
          decision: 0,
          completed: false,
        },
      },
    },
  };
}

function phaseCount(battle, phase) {
  return (battle.phase_trace ?? []).filter((entry) => entry.phase === phase).length;
}

{
  const state = runtime();
  const battle = state.variables.mapless.battle;
  ensureSafariBattleOrchestrator(state);
  beginSafariBattleCommand(state, "move");
  const resolution = {
    decision: 0,
    foeReplacementApplied: true,
    operations: [
      { op: "use_move", actor: "player", target: "foe" },
      { op: "faint", actor: "player", target: "foe" },
      { op: "send_out", actor: "foe" },
    ],
  };
  const first = commitSafariBattleResolution(state, resolution, "move");
  assert.equal(first.phase, SAFARI_BATTLE_PHASE.COMMAND);
  assert.equal(phaseCount(battle, SAFARI_BATTLE_PHASE.CHECK_1), 1);
  assert.equal(phaseCount(battle, SAFARI_BATTLE_PHASE.POST_FAINT), 1);
  assert.equal(phaseCount(battle, SAFARI_BATTLE_PHASE.REPLACEMENT), 1);
  const traceLength = battle.phase_trace.length;

  const replay = commitSafariBattleResolution(state, structuredClone(resolution), "move");
  assert.equal(replay.phase, SAFARI_BATTLE_PHASE.COMMAND);
  assert.equal(battle.phase_trace.length, traceLength);
  assert.equal(phaseCount(battle, SAFARI_BATTLE_PHASE.CHECK_1), 1);
  assert.equal(phaseCount(battle, SAFARI_BATTLE_PHASE.POST_FAINT), 1);
  assert.equal(phaseCount(battle, SAFARI_BATTLE_PHASE.REPLACEMENT), 1);
}

{
  const state = runtime();
  const battle = state.variables.mapless.battle;
  ensureSafariBattleOrchestrator(state);
  beginSafariBattleCommand(state, "move");
  const resolution = {
    decision: 0,
    operations: [
      { op: "try_use_move_failed", actor: "player", reason: "paralysis" },
      { op: "use_move", actor: "foe", target: "player" },
    ],
  };
  commitSafariBattleResolution(state, resolution, "move");
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
  assert.equal(phaseCount(battle, SAFARI_BATTLE_PHASE.ACTION_2), 1);
  assert.equal(phaseCount(battle, SAFARI_BATTLE_PHASE.CHECK_2), 1);
  const traceLength = battle.phase_trace.length;

  commitSafariBattleResolution(state, structuredClone(resolution), "move");
  assert.equal(battle.phase_trace.length, traceLength);
  assert.equal(phaseCount(battle, SAFARI_BATTLE_PHASE.ACTION_2), 1);
  assert.equal(phaseCount(battle, SAFARI_BATTLE_PHASE.CHECK_2), 1);
}

{
  const state = runtime();
  const battle = state.variables.mapless.battle;
  ensureSafariBattleOrchestrator(state);
  beginSafariBattleCommand(state, "move");
  const resolution = {
    decision: 0,
    playerReplacementRequired: true,
    operations: [{ op: "faint", actor: "foe", target: "player" }],
  };
  commitSafariBattleResolution(state, resolution, "move");
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.REPLACEMENT);
  assert.equal(phaseCount(battle, SAFARI_BATTLE_PHASE.REPLACEMENT), 1);
  const traceLength = battle.phase_trace.length;

  const replay = commitSafariBattleResolution(state, structuredClone(resolution), "move");
  assert.equal(replay.phase, SAFARI_BATTLE_PHASE.REPLACEMENT);
  assert.equal(battle.phase_trace.length, traceLength);
  assert.equal(phaseCount(battle, SAFARI_BATTLE_PHASE.REPLACEMENT), 1);
}

console.log("Safari Battle resolution idempotency smoke passed");
