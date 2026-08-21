import assert from "node:assert/strict";
import "./safari-battle-explicit-return-begin-smoke.mjs";
import {
  SAFARI_BATTLE_PHASE,
  beginSafariBattleCommand,
  commitSafariBattleResolution,
  ensureSafariBattleOrchestrator,
  safariBattleCommandAllowed,
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
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
  battle.completed = true;
  assert.equal(safariBattleCommandAllowed(state), true,
    "COMMAND itself must be the sole command-readiness truth; legacy completed flags must not form a parallel gate");
  battle.completed = false;
  beginSafariBattleCommand(state, "move");
  assert.equal(safariBattleCommandAllowed(state), false,
    "non-COMMAND phases must reject the next command without consulting UI busy or compatibility flags");
}

{
  const state = runtime();
  const battle = state.variables.mapless.battle;
  ensureSafariBattleOrchestrator(state);
  const traceLength = battle.phase_trace.length;
  assert.throws(
    () => commitSafariBattleResolution(state, {
      decision: 0,
      operations: [{ op: "use_move", actor: "player", target: "foe" }],
    }, "move"),
    /fresh battle resolution requires ACTION_1; got COMMAND/,
    "a fresh resolution must not bypass COMMAND -> ACTION_1 by committing directly from COMMAND",
  );
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
  assert.equal(battle.phase_trace.length, traceLength,
    "rejected direct resolution must not append CHECK/ACTION phases");
  assert.equal(battle.resolution_checkpoint ?? null, null);
}

{
  const state = runtime();
  const battle = state.variables.mapless.battle;
  ensureSafariBattleOrchestrator(state);
  beginSafariBattleCommand(state, "move");
  const committedResolution = {
    decision: 0,
    operations: [
      { op: "use_move", actor: "player", target: "foe" },
      { op: "use_move", actor: "foe", target: "player" },
    ],
  };
  commitSafariBattleResolution(state, committedResolution, "move");
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
  assert.equal(Number.isInteger(committedResolution.orchestratorCommandSequence), true,
    "the committed resolution must retain its central command identity for compatibility replay");
  const traceLength = battle.phase_trace.length;

  const taggedReplay = commitSafariBattleResolution(state, structuredClone(committedResolution), "move");
  assert.equal(taggedReplay.phase, SAFARI_BATTLE_PHASE.COMMAND);
  assert.equal(battle.phase_trace.length, traceLength,
    "a tagged structured-clone replay of the committed resolution must remain exactly-once");

  const implicitKindReplay = commitSafariBattleResolution(state, structuredClone(committedResolution));
  assert.equal(implicitKindReplay.phase, SAFARI_BATTLE_PHASE.COMMAND);
  assert.equal(battle.phase_trace.length, traceLength,
    "a centrally tagged committed replay must recover its command kind from the central checkpoint when adapters omit it");

  const unrelatedResolution = {
    decision: 0,
    operations: [{ op: "use_move", actor: "foe", target: "player" }],
  };
  assert.throws(
    () => commitSafariBattleResolution(state, unrelatedResolution, "move"),
    /fresh battle resolution requires ACTION_1; got COMMAND/,
    "an untagged fresh result must not impersonate the previous command's committed replay while COMMAND is idle",
  );
  assert.equal(unrelatedResolution.orchestratorCommandSequence ?? null, null,
    "rejected untagged results must not be mutated into the previous command identity");
  assert.equal(battle.phase_trace.length, traceLength,
    "rejected untagged results must not append any phase after the committed command");
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
  assert.throws(
    () => commitSafariBattleResolution(state, resolution, "move"),
    /pre-applied foe replacement is not accepted/,
    "the orchestrator must reject compatibility results that mutate the foe reserve before REPLACEMENT",
  );
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.ACTION_1);
  assert.equal(phaseCount(battle, SAFARI_BATTLE_PHASE.REPLACEMENT), 0);
  assert.equal(battle.replacement_checkpoint ?? null, null);
  assert.equal(battle.resolution_checkpoint ?? null, null);
}

{
  const state = runtime();
  const battle = state.variables.mapless.battle;
  ensureSafariBattleOrchestrator(state);
  beginSafariBattleCommand(state, "move");
  const resolution = {
    decision: 0,
    playerReplacementApplied: true,
    operations: [
      { op: "use_move", actor: "foe", target: "player" },
      { op: "faint", actor: "foe", target: "player" },
      { op: "send_out", actor: "player" },
    ],
  };
  assert.throws(
    () => commitSafariBattleResolution(state, resolution, "move"),
    /pre-applied player replacement is not accepted/,
    "the orchestrator must reject compatibility results that mutate the player reserve before REPLACEMENT",
  );
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.ACTION_1);
  assert.equal(phaseCount(battle, SAFARI_BATTLE_PHASE.REPLACEMENT), 0);
  assert.equal(battle.replacement_checkpoint ?? null, null);
  assert.equal(battle.resolution_checkpoint ?? null, null);
}

{
  const state = runtime();
  const battle = state.variables.mapless.battle;
  ensureSafariBattleOrchestrator(state);
  beginSafariBattleCommand(state, "move");
  battle.completed = true;
  const resolution = {
    decision: 0,
    operations: [{ op: "use_move", actor: "player", target: "foe" }],
  };
  assert.throws(
    () => commitSafariBattleResolution(state, resolution, "move"),
    /pre-RESULT battle completion is not accepted/,
    "completed must never act as a second terminal truth before RESULT",
  );
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.ACTION_1);
  assert.equal(phaseCount(battle, SAFARI_BATTLE_PHASE.POST_VICTORY), 0);
  assert.equal(phaseCount(battle, SAFARI_BATTLE_PHASE.RESULT), 0);
  assert.equal(battle.resolution_checkpoint ?? null, null);
}

{
  const state = runtime();
  const battle = state.variables.mapless.battle;
  ensureSafariBattleOrchestrator(state);
  beginSafariBattleCommand(state, "move");
  let replacementCommits = 0;
  const resolution = {
    decision: 0,
    foeReplacementRequired: true,
    operations: [
      { op: "use_move", actor: "player", target: "foe" },
      { op: "faint", actor: "player", target: "foe" },
    ],
  };
  const first = commitSafariBattleResolution(state, resolution, "move", {
    replacementCommit(current) {
      replacementCommits += 1;
      return {
        ...current,
        foeReplacementRequired: false,
        foeReplacementApplied: true,
        operations: [...current.operations, { op: "send_out", actor: "foe" }],
      };
    },
  });
  assert.equal(first.phase, SAFARI_BATTLE_PHASE.COMMAND);
  assert.equal(first.foeReplacementRequired, false);
  assert.equal(first.foeReplacementApplied, true);
  assert.equal(first.operations.some((operation) => operation?.op === "send_out"), true);
  assert.equal(replacementCommits, 1);
  assert.equal(phaseCount(battle, SAFARI_BATTLE_PHASE.CHECK_1), 1);
  assert.equal(phaseCount(battle, SAFARI_BATTLE_PHASE.POST_FAINT), 1);
  assert.equal(phaseCount(battle, SAFARI_BATTLE_PHASE.REPLACEMENT), 1);
  const traceLength = battle.phase_trace.length;

  const replay = commitSafariBattleResolution(state, structuredClone(resolution), "move", {
    replacementCommit() {
      replacementCommits += 1;
      throw new Error("replacement must not replay");
    },
  });
  assert.equal(replay.phase, SAFARI_BATTLE_PHASE.COMMAND);
  assert.equal(replay.foeReplacementRequired, false,
    "replay must return the centrally committed post-replacement result, not the caller's stale pre-commit input");
  assert.equal(replay.foeReplacementApplied, true,
    "replay must preserve replacement fields produced by the original central commit");
  assert.equal(replay.operations.some((operation) => operation?.op === "send_out"), true,
    "replay must preserve operations appended by the committed replacement owner");
  assert.equal(replacementCommits, 1);
  assert.equal(battle.phase_trace.length, traceLength);
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
      { op: "use_move", actor: "player", target: "foe" },
      { op: "use_move", actor: "foe", target: "player" },
    ],
  };
  commitSafariBattleResolution(state, resolution, "move");
  const traceLength = battle.phase_trace.length;
  const commandCount = phaseCount(battle, SAFARI_BATTLE_PHASE.COMMAND);

  const replay = commitSafariBattleResolution(state, {
    ...structuredClone(resolution),
    turnConsumed: false,
  }, "move");
  assert.equal(replay.phase, SAFARI_BATTLE_PHASE.COMMAND);
  assert.equal(battle.phase_trace.length, traceLength,
    "a committed resolution replay must be idempotent even if a compatibility adapter changes turnConsumed");
  assert.equal(phaseCount(battle, SAFARI_BATTLE_PHASE.COMMAND), commandCount,
    "committed replay must not append a second COMMAND through the unconsumed-command rollback path");
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
  const blockedChecks = battle.phase_trace.filter((entry) => [
    SAFARI_BATTLE_PHASE.CHECK_1,
    SAFARI_BATTLE_PHASE.CHECK_2,
  ].includes(entry.phase));
  assert.deepEqual(blockedChecks.map((entry) => entry.actor), ["player", "foe"],
    "status-blocked ACTION_1 and the surviving foe ACTION_2 must each own their following CHECK actor");
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

{
  const state = runtime();
  const battle = state.variables.mapless.battle;
  ensureSafariBattleOrchestrator(state);
  beginSafariBattleCommand(state, "move");
  commitSafariBattleResolution(state, {
    decision: 0,
    operations: [
      { op: "use_move", actor: "foe", target: "player" },
      { op: "use_move", actor: "player", target: "foe" },
    ],
  }, "move");
  const actionTrace = battle.phase_trace.filter((entry) => [
    SAFARI_BATTLE_PHASE.ACTION_1,
    SAFARI_BATTLE_PHASE.ACTION_2,
  ].includes(entry.phase));
  assert.deepEqual(actionTrace.map((entry) => entry.actor), ["foe", "player"],
    "move ACTION_1/ACTION_2 must reflect the scheduler-resolved actor order rather than command-entry order");
  const checkTrace = battle.phase_trace.filter((entry) => [
    SAFARI_BATTLE_PHASE.CHECK_1,
    SAFARI_BATTLE_PHASE.CHECK_2,
  ].includes(entry.phase));
  assert.deepEqual(checkTrace.map((entry) => entry.actor), ["foe", "player"],
    "CHECK_1/CHECK_2 must remain bound to the scheduler-resolved action actors");
}

{
  const state = runtime();
  const battle = state.variables.mapless.battle;
  ensureSafariBattleOrchestrator(state);
  beginSafariBattleCommand(state, "item");
  commitSafariBattleResolution(state, {
    decision: 0,
    operations: [{ op: "use_move", actor: "foe", target: "player" }],
  }, "item");
  const actionTrace = battle.phase_trace.filter((entry) => [
    SAFARI_BATTLE_PHASE.ACTION_1,
    SAFARI_BATTLE_PHASE.ACTION_2,
  ].includes(entry.phase));
  assert.deepEqual(actionTrace.map((entry) => entry.actor), ["player", "foe"],
    "a consumed Bag command owns ACTION_1 and the opponent response owns ACTION_2");
  const checkTrace = battle.phase_trace.filter((entry) => [
    SAFARI_BATTLE_PHASE.CHECK_1,
    SAFARI_BATTLE_PHASE.CHECK_2,
  ].includes(entry.phase));
  assert.deepEqual(checkTrace.map((entry) => entry.actor), ["player", "foe"],
    "a consumed Bag command and the foe response must each own their following CHECK actor");
}

console.log("Safari Battle resolution idempotency smoke passed");
