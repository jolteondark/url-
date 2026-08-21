import assert from "node:assert/strict";
import {
  SAFARI_BATTLE_PHASE,
  beginSafariBattleCommand,
  beginSafariBattleReturn,
  commitSafariBattleResolution,
  completeSafariBattleReturn,
  ensureSafariBattleOrchestrator,
} from "../runtime/safari-battle-orchestrator.js";
import { activateSafariWebCombatCell } from "../runtime/safari-web-combat-start.js";

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

const rt = runtime();
const state = rt.variables.mapless;
ensureSafariBattleOrchestrator(rt);
beginSafariBattleCommand(rt, "move");
commitSafariBattleResolution(rt, {
  decision: 1,
  operations: [
    { op: "use_move", actor: "player" },
    { op: "faint", target: "foe" },
  ],
}, "move");

assert.equal(state.battle.phase, SAFARI_BATTLE_PHASE.RESULT);
assert.equal(state.battle.completed, true);

state.board_events = [{ kind: "wild" }];
state.board_consumed = [false];
const completedBattle = state.battle;
const blockedStart = await activateSafariWebCombatCell(rt, 0);
assert.equal(blockedStart.result, "battle_active",
  "a completed RESULT battle must remain active until the explicit RETURN transition clears it");
assert.equal(state.battle, completedBattle,
  "starting the next combat must not overwrite the completed RESULT battle before RETURN");
assert.equal(state.battle.phase, SAFARI_BATTLE_PHASE.RESULT);
assert.deepEqual(state.board_consumed, [false],
  "a blocked next-combat attempt must not consume the next board cell before RETURN");

assert.throws(
  () => completeSafariBattleReturn(rt, {
    target: "day_board",
    operations: [{ op: "return_to_day_board" }],
  }),
  /requires beginSafariBattleReturn from RESULT/,
  "RETURN completion must fail closed unless RESULT explicitly entered RETURN first",
);
assert.equal(state.battle.phase, SAFARI_BATTLE_PHASE.RESULT,
  "a rejected direct completion must leave the retryable RESULT boundary intact");
assert.equal(state.pending_battle_return_checkpoint, null);
assert.equal(state.battle_return_checkpoint, null,
  "a rejected direct completion must not fabricate a committed RETURN checkpoint");
assert.equal((state.last_operations ?? []).some((operation) => operation?.op === "request_save"), false,
  "a rejected direct completion must not publish the post-RETURN save request");

beginSafariBattleReturn(rt);
assert.equal(state.battle.phase, SAFARI_BATTLE_PHASE.RETURN);
assert.equal(state.pending_battle_return_checkpoint?.committed, false);
state.battle = null;

const blockedDuringReturnCommit = await activateSafariWebCombatCell(rt, 0);
assert.equal(blockedDuringReturnCommit.result, "battle_return_pending",
  "clearing the Battle object must not permit a new combat before RETURN persistence commits");
assert.equal(state.battle, null,
  "a combat attempt during the RETURN persistence window must not create a replacement Battle object");
assert.deepEqual(state.board_consumed, [false],
  "a combat attempt during the RETURN persistence window must not consume the next board cell");
assert.equal(state.pending_battle_return_checkpoint?.committed, false,
  "the central pending RETURN checkpoint remains the sole readiness truth until completion");

const returned = completeSafariBattleReturn(rt, {
  target: "day_board",
  operations: [{ op: "return_to_day_board" }],
});
assert.equal(returned.phase, SAFARI_BATTLE_PHASE.RETURN);
assert.equal(returned.operations.filter((operation) => operation.op === "request_save").length, 1);
assert.equal(state.battle_return_checkpoint?.committed, true);
assert.equal(state.pending_battle_return_checkpoint, null);

const replayed = completeSafariBattleReturn(rt, {
  target: "day_board",
  operations: [{ op: "return_to_day_board" }, { op: "should_not_commit" }],
});
assert.deepEqual(replayed.operations, returned.operations,
  "compatibility replay may reuse only the already-committed explicit RETURN snapshot");
assert.equal(replayed.operations.filter((operation) => operation.op === "request_save").length, 1);

console.log("safari battle explicit return begin smoke: PASS");