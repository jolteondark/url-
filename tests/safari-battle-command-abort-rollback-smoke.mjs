import assert from "node:assert/strict";
import {
  SAFARI_BATTLE_PHASE,
  abortSafariBattleCommand,
  beginSafariBattleCommand,
  captureSafariBattleCommandAttempt,
  ensureSafariBattleOrchestrator,
  safariBattleCommandAllowed,
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

for (const commandKind of ["move", "item", "capture", "flee", "switch"]) {
  const rt = runtime();
  const battle = rt.variables.mapless.battle;
  assert.equal(ensureSafariBattleOrchestrator(rt), SAFARI_BATTLE_PHASE.COMMAND);
  beginSafariBattleCommand(rt, commandKind);
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.ACTION_1);
  assert.equal(battle.pending_command_kind, commandKind);

  abortSafariBattleCommand(rt, `${commandKind} failed:test`);

  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
  assert.equal(battle.pending_command_kind, null);
  assert.equal(safariBattleCommandAllowed(rt), true);
  assert.deepEqual(
    battle.phase_trace.map((step) => step.phase),
    [SAFARI_BATTLE_PHASE.COMMAND, SAFARI_BATTLE_PHASE.COMMAND],
    `${commandKind} exception rollback must not leave a phantom ACTION_1 in the central phase trace`,
  );
  assert.match(battle.phase_trace.at(-1).reason, new RegExp(`${commandKind} failed:test`));

  beginSafariBattleCommand(rt, commandKind);
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.ACTION_1,
    `${commandKind} must be retryable immediately after central rollback`);
}

{
  const rt = runtime();
  const battle = rt.variables.mapless.battle;
  ensureSafariBattleOrchestrator(rt);

  beginSafariBattleCommand(rt, "move");
  const firstAttempt = captureSafariBattleCommandAttempt(rt);
  abortSafariBattleCommand(rt, "first move failed", { commandAttempt: firstAttempt });
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.COMMAND);

  beginSafariBattleCommand(rt, "move");
  const secondAttempt = captureSafariBattleCommandAttempt(rt);
  const traceBeforeStaleAbort = structuredClone(battle.phase_trace);
  assert.throws(
    () => abortSafariBattleCommand(rt, "late first move failure", { commandAttempt: firstAttempt }),
    /stale battle command attempt belongs to command sequence/,
    "a delayed catch from the previous command must not roll back the current ACTION_1",
  );
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.ACTION_1);
  assert.equal(battle.pending_command_sequence, secondAttempt.sequence);
  assert.equal(battle.pending_command_kind, "move");
  assert.deepEqual(battle.phase_trace, traceBeforeStaleAbort,
    "stale abort rejection must not mutate the current command phase trace");

  abortSafariBattleCommand(rt, "second move failed", { commandAttempt: secondAttempt });
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
  assert.equal(battle.pending_command_kind, null);
}

await import("./safari-battle-command-attempt-provenance-smoke.mjs");
console.log("safari battle command abort rollback smoke: PASS");
