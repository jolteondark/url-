import assert from "node:assert/strict";
import {
  SAFARI_BATTLE_PHASE,
  abortSafariBattleCommand,
  beginSafariBattleCommand,
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

await import("./safari-battle-command-attempt-provenance-smoke.mjs");
console.log("safari battle command abort rollback smoke: PASS");
