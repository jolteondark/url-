import assert from "node:assert/strict";
import {
  SAFARI_BATTLE_PHASE,
  beginSafariBattleCommand,
  commitSafariBattleResolution,
  completeSafariBattleReplacement,
  ensureSafariBattleOrchestrator,
} from "../runtime/safari-battle-orchestrator.js";

function runtime(battle = {}) {
  return {
    variables: {
      mapless: {
        battle: {
          turn: 1,
          decision: 0,
          completed: false,
          ...battle,
        },
      },
    },
  };
}

{
  const rt = runtime();
  assert.equal(ensureSafariBattleOrchestrator(rt), SAFARI_BATTLE_PHASE.COMMAND);
  beginSafariBattleCommand(rt, "move");
  const result = {
    decision: 1,
    operations: [
      { op: "use_move", actor: "player" },
      { op: "faint", target: "foe" },
      { op: "gain_exp", amount: 20 },
      { op: "request_save" },
    ],
  };
  // Compatibility finalizers may still mark terminal completion before returning.
  // The orchestration owner must hide that until its RESULT boundary.
  rt.variables.mapless.battle.completed = true;
  commitSafariBattleResolution(rt, result, "move");
  const battle = rt.variables.mapless.battle;
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.RESULT);
  assert.equal(battle.completed, true);
  assert.equal(battle.completed_phase, SAFARI_BATTLE_PHASE.RESULT);
  assert.deepEqual(
    battle.phase_trace.map((step) => step.phase),
    [
      "COMMAND",
      "ACTION_1",
      "CHECK_1",
      "POST_FAINT",
      "POST_VICTORY",
      "REWARD_GROWTH",
      "RESULT",
    ],
  );
  assert.equal(
    battle.phase_trace
      .filter((step) => ["CHECK_1", "POST_FAINT", "POST_VICTORY", "REWARD_GROWTH", "RESULT"].includes(step.phase))
      .some((step) => step.completed),
    false,
  );
}

{
  const rt = runtime();
  ensureSafariBattleOrchestrator(rt);
  beginSafariBattleCommand(rt, "move");
  const result = {
    decision: 0,
    foeReplacementApplied: true,
    operations: [
      { op: "use_move", actor: "player" },
      { op: "faint", target: "foe" },
    ],
  };
  commitSafariBattleResolution(rt, result, "move");
  assert.equal(rt.variables.mapless.battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
  assert.equal(rt.variables.mapless.battle.completed, false);
  const phases = rt.variables.mapless.battle.phase_trace.map((step) => step.phase);
  assert.deepEqual(phases.slice(-3), ["POST_FAINT", "REPLACEMENT", "COMMAND"]);
  assert.equal(phases.includes("RESULT"), false);
}

{
  const rt = runtime({ player_replacement_required: true });
  ensureSafariBattleOrchestrator(rt);
  beginSafariBattleCommand(rt, "move");
  const result = {
    decision: 0,
    playerReplacementRequired: true,
    operations: [
      { op: "use_move", actor: "foe" },
      { op: "faint", target: "player" },
    ],
  };
  commitSafariBattleResolution(rt, result, "move");
  assert.equal(rt.variables.mapless.battle.phase, SAFARI_BATTLE_PHASE.REPLACEMENT);
  assert.equal(rt.variables.mapless.battle.completed, false);
  rt.variables.mapless.battle.player_replacement_required = false;
  completeSafariBattleReplacement(rt, {});
  assert.equal(rt.variables.mapless.battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
}

console.log("safari battle orchestrator phase smoke: PASS");
