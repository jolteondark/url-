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
          turn: 1,
          decision: 0,
          completed: false,
        },
      },
    },
  };
}

{
  const state = runtime();
  const battle = state.variables.mapless.battle;
  ensureSafariBattleOrchestrator(state);

  beginSafariBattleCommand(state, "move");
  const firstResolution = {
    decision: 0,
    operations: [
      { op: "use_move", actor: "player", target: "foe" },
      { op: "use_move", actor: "foe", target: "player" },
    ],
  };
  const first = commitSafariBattleResolution(state, firstResolution, "move");
  assert.equal(first.orchestratorCommandSequence, 1,
    "the central orchestrator must stamp the resolved result with the command sequence it consumed");
  assert.equal(Number.isInteger(first.orchestratorBattleInstanceSequence), true,
    "the central orchestrator must stamp the resolved result with the battle instance it consumed");
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.COMMAND);

  beginSafariBattleCommand(state, "move");
  assert.equal(battle.command_sequence, 2);
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.ACTION_1);
  const traceLengthBeforeStaleReplay = battle.phase_trace.length;

  assert.throws(
    () => commitSafariBattleResolution(state, structuredClone(firstResolution), "move"),
    /stale battle resolution belongs to command sequence 1; current command sequence is 2/,
    "a delayed compatibility replay from the previous COMMAND must not be accepted as the next command resolution",
  );
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.ACTION_1,
    "rejecting a stale resolution must leave the current command waiting for its own mechanics result");
  assert.equal(battle.phase_trace.length, traceLengthBeforeStaleReplay,
    "rejecting a stale resolution must not materialize CHECK/ACTION phases for the current command");
  assert.equal(battle.resolution_checkpoint?.sequence, 1,
    "the committed checkpoint from the previous command must remain intact until the current resolution is accepted");

  const secondResolution = {
    decision: 0,
    operations: [
      { op: "use_move", actor: "foe", target: "player" },
      { op: "use_move", actor: "player", target: "foe" },
    ],
  };
  const second = commitSafariBattleResolution(state, secondResolution, "move");
  assert.equal(second.orchestratorCommandSequence, 2);
  assert.equal(second.orchestratorBattleInstanceSequence, first.orchestratorBattleInstanceSequence);
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
  assert.equal(battle.resolution_checkpoint.sequence, 2);
  assert.equal(battle.resolution_checkpoint.committed, true);
}

{
  const firstState = runtime();
  ensureSafariBattleOrchestrator(firstState);
  beginSafariBattleCommand(firstState, "move");
  const firstBattleResolution = {
    decision: 0,
    operations: [
      { op: "use_move", actor: "player", target: "foe" },
      { op: "use_move", actor: "foe", target: "player" },
    ],
  };
  const firstCommitted = commitSafariBattleResolution(firstState, firstBattleResolution, "move");
  const firstBattleInstance = firstCommitted.orchestratorBattleInstanceSequence;
  assert.equal(Number.isInteger(firstBattleInstance), true);

  const secondState = runtime();
  const secondBattle = secondState.variables.mapless.battle;
  ensureSafariBattleOrchestrator(secondState);
  beginSafariBattleCommand(secondState, "move");
  assert.equal(secondBattle.command_sequence, 1,
    "a fresh battle may reuse command sequence 1, so replay identity must include the battle instance");
  const traceLengthBeforeCrossBattleReplay = secondBattle.phase_trace.length;

  assert.throws(
    () => commitSafariBattleResolution(secondState, structuredClone(firstCommitted), "move"),
    /stale battle resolution belongs to battle instance/,
    "a tagged resolution from another battle instance must not impersonate this battle's same-numbered command",
  );
  assert.equal(secondBattle.phase, SAFARI_BATTLE_PHASE.ACTION_1,
    "rejecting a cross-battle replay must leave the current battle waiting for its own resolution");
  assert.equal(secondBattle.phase_trace.length, traceLengthBeforeCrossBattleReplay,
    "rejecting a cross-battle replay must not append CHECK/ACTION phases");
  assert.equal(secondBattle.resolution_checkpoint ?? null, null,
    "rejecting a cross-battle replay must not create a checkpoint for the stale result");

  const secondCommitted = commitSafariBattleResolution(secondState, {
    decision: 0,
    operations: [
      { op: "use_move", actor: "foe", target: "player" },
      { op: "use_move", actor: "player", target: "foe" },
    ],
  }, "move");
  assert.notEqual(secondCommitted.orchestratorBattleInstanceSequence, firstBattleInstance,
    "each fresh battle must receive a distinct central battle-instance identity");
  assert.equal(secondCommitted.orchestratorCommandSequence, 1);
  assert.equal(secondBattle.phase, SAFARI_BATTLE_PHASE.COMMAND);
}

console.log("Safari Battle stale resolution sequence smoke passed");
