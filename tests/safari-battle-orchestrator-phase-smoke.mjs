import assert from "node:assert/strict";
import {
  SAFARI_BATTLE_PHASE,
  abortSafariBattleReturn,
  beginSafariBattleCommand,
  beginSafariBattleReturn,
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

  const traceLength = battle.phase_trace.length;
  const replay = commitSafariBattleResolution(rt, structuredClone(result), "move");
  assert.equal(replay.phase, SAFARI_BATTLE_PHASE.RESULT);
  assert.equal(battle.phase_trace.length, traceLength,
    "replaying an already-committed terminal resolution must not duplicate reward/result phases");
  assert.equal(battle.phase_trace.filter((step) => step.phase === SAFARI_BATTLE_PHASE.REWARD_GROWTH).length, 1);
  assert.equal(battle.phase_trace.filter((step) => step.phase === SAFARI_BATTLE_PHASE.RESULT).length, 1);

  beginSafariBattleReturn(rt);
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.RETURN);
  assert.equal(battle.completed, true, "RETURN keeps terminal completion committed");
  abortSafariBattleReturn(rt, "return failed:test");
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.RESULT,
    "failed RETURN must roll back through the central owner to the retryable RESULT boundary");
  assert.equal(battle.completed, true);
  assert.deepEqual(battle.phase_trace.slice(-2).map((step) => step.phase), ["RETURN", "RESULT"]);
  assert.match(battle.phase_trace.at(-1).reason, /return failed:test/);
  assert.deepEqual(
    rt.variables.mapless.last_battle_phase_trace,
    battle.phase_trace,
    "RETURN rollback must publish the same owner trace used by Save/Continue diagnostics",
  );
}

{
  const rt = runtime();
  ensureSafariBattleOrchestrator(rt);
  beginSafariBattleCommand(rt, "move");
  commitSafariBattleResolution(rt, {
    decision: 2,
    operations: [{ op: "use_move", actor: "foe" }, { op: "faint", target: "player" }],
  }, "move");
  const battle = rt.variables.mapless.battle;
  assert.equal(battle.completed, true);
  assert.deepEqual(
    battle.phase_trace.map((step) => step.phase),
    ["COMMAND", "ACTION_1", "CHECK_1", "POST_FAINT", "POST_VICTORY", "REWARD_GROWTH", "RESULT"],
    "loss/run-end terminals still pass through the single REWARD_GROWTH checkpoint",
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
  assert.equal(rt.variables.mapless.battle.phase_trace.some((step) => step.phase === SAFARI_BATTLE_PHASE.ACTION_2), false,
    "foe-first player KO must not invent a player ACTION_2");
  rt.variables.mapless.battle.player_replacement_required = false;
  completeSafariBattleReplacement(rt, {});
  assert.equal(rt.variables.mapless.battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
}

for (const commandKind of ["item", "capture", "flee", "switch"]) {
  const rt = runtime();
  ensureSafariBattleOrchestrator(rt);
  beginSafariBattleCommand(rt, commandKind);
  commitSafariBattleResolution(rt, {
    decision: 0,
    operations: [{ op: "use_move", actor: "foe" }],
  }, commandKind);
  const phases = rt.variables.mapless.battle.phase_trace.map((step) => step.phase);
  assert.deepEqual(phases, ["COMMAND", "ACTION_1", "CHECK_1", "ACTION_2", "CHECK_2", "COMMAND"],
    `${commandKind} consumes ACTION_1, so one living-foe response must be ACTION_2 exactly once`);
}

for (const commandKind of ["item", "capture", "flee", "switch"]) {
  const rt = runtime();
  ensureSafariBattleOrchestrator(rt);
  beginSafariBattleCommand(rt, commandKind);
  commitSafariBattleResolution(rt, { decision: 0, operations: [] }, commandKind);
  const phases = rt.variables.mapless.battle.phase_trace.map((step) => step.phase);
  assert.equal(phases.includes("ACTION_2"), false,
    `${commandKind} must not invent ACTION_2 when no foe response occurred`);
}

console.log("safari battle orchestrator phase smoke: PASS");
