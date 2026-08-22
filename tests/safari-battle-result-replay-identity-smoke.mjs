import assert from "node:assert/strict";
import {
  SAFARI_BATTLE_PHASE,
  beginSafariBattleCommand,
  beginSafariBattleReturn,
  commitSafariBattleResolution,
  completeSafariBattleReplacement,
  completeSafariBattleReturn,
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
beginSafariBattleCommand(state, "move");

const terminal = {
  decision: 1,
  operations: [
    { op: "use_move", actor: "player", target: "foe" },
    { op: "faint", actor: "player", target: "foe" },
    { op: "request_save", reason: "terminal result" },
  ],
};

const committed = commitSafariBattleResolution(state, terminal, "move");
assert.equal(battle.phase, SAFARI_BATTLE_PHASE.RESULT);
assert.equal(battle.completed, true);
assert.equal(Number.isInteger(committed.orchestratorCommandSequence), true);
const traceLength = battle.phase_trace.length;

const replay = commitSafariBattleResolution(state, structuredClone(committed), "move");
assert.equal(replay.phase, SAFARI_BATTLE_PHASE.RESULT);
assert.equal(battle.phase_trace.length, traceLength,
  "a tagged replay of the committed terminal resolution must remain exactly-once at RESULT");

const unrelatedTerminal = {
  decision: 1,
  operations: [{ op: "request_save", reason: "unrelated terminal result" }],
};
assert.throws(
  () => commitSafariBattleResolution(state, unrelatedTerminal, "move"),
  /RESULT battle resolution replay requires committed command identity/,
  "RESULT must not accept an untagged terminal-shaped result as a compatibility replay",
);
assert.equal(unrelatedTerminal.orchestratorCommandSequence ?? null, null,
  "rejected RESULT replays must not be mutated into the committed command identity");
assert.equal(battle.phase_trace.length, traceLength,
  "rejected RESULT replays must not append phases or re-run terminal lifecycle work");

const staleTerminal = {
  ...structuredClone(committed),
  orchestratorCommandSequence: committed.orchestratorCommandSequence + 1,
};
assert.throws(
  () => commitSafariBattleResolution(state, staleTerminal, "move"),
  /RESULT battle resolution replay requires committed command identity/,
  "RESULT must reject a terminal replay tagged for another command sequence",
);
assert.equal(battle.phase_trace.length, traceLength);

beginSafariBattleReturn(state);
assert.equal(battle.phase, SAFARI_BATTLE_PHASE.RETURN);
const returnTraceLength = battle.phase_trace.length;
assert.throws(
  () => completeSafariBattleReturn(state, {
    target: "day_board",
    operations: [{ op: "return_to_day_board" }],
  }),
  /active battle to be cleared/,
  "RETURN must not commit the post-Battle save while the completed Battle object is still active",
);
assert.equal(state.variables.mapless.pending_battle_return_checkpoint?.committed, false,
  "failed pre-clear RETURN completion must preserve the pending checkpoint for the real return owner");
assert.equal(state.variables.mapless.battle_return_checkpoint ?? null, null,
  "failed pre-clear RETURN completion must not publish a committed save checkpoint");
assert.equal(battle.phase, SAFARI_BATTLE_PHASE.RETURN);
assert.equal(battle.phase_trace.length, returnTraceLength,
  "pre-clear RETURN rejection must not append a second phase transition");

state.variables.mapless.battle = null;
const pendingReturnCheckpoint = state.variables.mapless.pending_battle_return_checkpoint;
const forgedNextBattle = {
  turn: 1,
  decision: 0,
  completed: false,
};
state.variables.mapless.battle = forgedNextBattle;
assert.throws(
  () => ensureSafariBattleOrchestrator(state),
  /RETURN persistence is pending/,
  "the central orchestrator must not let a fresh Battle erase an uncommitted RETURN checkpoint",
);
assert.equal(state.variables.mapless.pending_battle_return_checkpoint, pendingReturnCheckpoint,
  "rejected fresh Battle initialization must preserve the exact pending RETURN checkpoint");
assert.equal(forgedNextBattle.phase ?? null, null,
  "rejected fresh Battle initialization must not publish COMMAND");
assert.equal(forgedNextBattle.orchestrator_battle_instance_sequence ?? null, null,
  "rejected fresh Battle initialization must not allocate a Battle instance identity");

state.variables.mapless.battle = null;
const returned = completeSafariBattleReturn(state, {
  target: "day_board",
  operations: [{ op: "return_to_day_board" }],
});
assert.equal(returned.phase, SAFARI_BATTLE_PHASE.RETURN);
assert.equal(returned.operations.filter((operation) => operation.op === "request_save").length, 1,
  "cleared Battle state may commit exactly one post-RETURN save checkpoint");
assert.equal(state.variables.mapless.battle_return_checkpoint?.committed, true);
assert.equal(state.variables.mapless.pending_battle_return_checkpoint, null);

const replayedReturn = completeSafariBattleReturn(state, {
  target: "day_board",
  operations: [{ op: "return_to_day_board" }],
});
assert.deepEqual(replayedReturn.operations, returned.operations,
  "RETURN compatibility replay must reuse the first committed operation/save snapshot");

state.variables.mapless.battle = {
  turn: 1,
  decision: 0,
  completed: false,
};
assert.throws(
  () => completeSafariBattleReturn(state, {}),
  /active battle to be cleared/,
  "a stale committed RETURN replay must not apply after a new Battle object becomes active",
);
assert.deepEqual(state.variables.mapless.battle_return_checkpoint.operations, returned.operations,
  "cross-Battle rejection must preserve the original committed RETURN snapshot without replaying it");

{
  const replacementState = runtime();
  const replacementBattle = replacementState.variables.mapless.battle;
  replacementBattle.player_replacement_required = true;
  ensureSafariBattleOrchestrator(replacementState);
  beginSafariBattleCommand(replacementState, "move");
  const replacementResolution = {
    decision: 0,
    playerReplacementRequired: true,
    operations: [
      { op: "use_move", actor: "foe", target: "player" },
      { op: "faint", actor: "foe", target: "player" },
    ],
  };
  const preReplacement = commitSafariBattleResolution(replacementState, replacementResolution, "move");
  assert.equal(preReplacement.phase, SAFARI_BATTLE_PHASE.REPLACEMENT);
  assert.equal(preReplacement.playerReplacementRequired, true);

  let replacementCommits = 0;
  const postReplacement = completeSafariBattleReplacement(replacementState, preReplacement, {
    replacementCommit(current) {
      replacementCommits += 1;
      replacementBattle.player_replacement_required = false;
      return {
        ...current,
        playerReplacementRequired: false,
        playerReplacementApplied: true,
        operations: [...(current.operations ?? []), { op: "send_out", actor: "player" }],
      };
    },
  });
  assert.equal(postReplacement.phase, SAFARI_BATTLE_PHASE.COMMAND);
  assert.equal(postReplacement.playerReplacementRequired, false);
  assert.equal(postReplacement.playerReplacementApplied, true);
  assert.equal(replacementCommits, 1);

  const replacementReplay = commitSafariBattleResolution(
    replacementState,
    structuredClone(replacementResolution),
    "move",
  );
  assert.equal(replacementReplay.phase, SAFARI_BATTLE_PHASE.COMMAND);
  assert.equal(replacementReplay.playerReplacementRequired, false,
    "replay after player replacement must use the centrally refreshed post-replacement snapshot");
  assert.equal(replacementReplay.playerReplacementApplied, true,
    "replay after player replacement must preserve the applied replacement truth");
  assert.equal(replacementReplay.operations.some((operation) => operation?.op === "send_out"), true,
    "replay after player replacement must preserve the committed send_out operation");
  assert.equal(replacementCommits, 1,
    "player replacement replay must not execute the replacement owner twice");
}

{
  const restoredState = runtime();
  const restoredBattle = restoredState.variables.mapless.battle;
  restoredBattle.completed = true;
  restoredBattle.decision = 1;
  restoredBattle.phase_trace = [
    { phase: SAFARI_BATTLE_PHASE.RESULT, turn: 1, reason: "saved result boundary", completed: true },
  ];
  delete restoredBattle.completed_phase;
  assert.equal(ensureSafariBattleOrchestrator(restoredState), SAFARI_BATTLE_PHASE.RESULT,
    "a saved completed Battle with RESULT trace evidence must restore at RESULT");
  assert.equal(restoredBattle.completed_phase, SAFARI_BATTLE_PHASE.RESULT,
    "restored RESULT must normalize completed_phase to the central RESULT boundary");
  assert.equal(restoredBattle.completed, true);
}

console.log("Safari Battle RESULT replay identity smoke passed");
