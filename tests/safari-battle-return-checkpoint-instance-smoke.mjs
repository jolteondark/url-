import assert from "node:assert/strict";
import {
  SAFARI_BATTLE_PHASE,
  beginSafariBattleCommand,
  beginSafariBattleReturn,
  commitSafariBattleResolution,
  completeSafariBattleReturn,
  ensureSafariBattleOrchestrator,
} from "../runtime/safari-battle-orchestrator.js";

function freshBattle() {
  return {
    turn: 1,
    decision: 0,
    completed: false,
  };
}

const runtime = {
  variables: {
    mapless: {
      battle: freshBattle(),
    },
  },
};

function finishBattleAndReturn(marker) {
  ensureSafariBattleOrchestrator(runtime);
  beginSafariBattleCommand(runtime, "move");
  commitSafariBattleResolution(runtime, {
    decision: 1,
    operations: [
      { op: "use_move", actor: "player" },
      { op: "faint", target: "foe" },
    ],
  }, "move");
  assert.equal(runtime.variables.mapless.battle.phase, SAFARI_BATTLE_PHASE.RESULT);
  beginSafariBattleReturn(runtime);
  runtime.variables.mapless.battle = null;
  return completeSafariBattleReturn(runtime, {
    operations: [{ op: marker }],
  });
}

const firstReturn = finishBattleAndReturn("return_first_battle");
assert.equal(runtime.variables.mapless.battle_return_checkpoint?.committed, true);
assert.equal(firstReturn.operations.some((operation) => operation.op === "return_first_battle"), true);
assert.equal(firstReturn.operations.filter((operation) => operation.op === "request_save").length, 1);

runtime.variables.mapless.battle = freshBattle();
assert.equal(ensureSafariBattleOrchestrator(runtime), SAFARI_BATTLE_PHASE.COMMAND);
assert.equal(runtime.variables.mapless.battle_return_checkpoint, null,
  "a fresh Battle must invalidate the committed RETURN snapshot from the previous Battle");
assert.equal(runtime.variables.mapless.pending_battle_return_checkpoint, null,
  "a fresh Battle must not inherit an uncommitted RETURN attempt from the previous Battle");

const secondReturn = finishBattleAndReturn("return_second_battle");
assert.equal(secondReturn.operations.some((operation) => operation.op === "return_second_battle"), true,
  "the second Battle RETURN must commit its own operation snapshot");
assert.equal(secondReturn.operations.some((operation) => operation.op === "return_first_battle"), false,
  "the second Battle RETURN must never replay the previous Battle's committed snapshot");
assert.equal(secondReturn.operations.filter((operation) => operation.op === "request_save").length, 1,
  "each Battle instance owns exactly one successful RETURN save checkpoint");

console.log("Safari Battle RETURN checkpoint is isolated per Battle instance: PASS");
