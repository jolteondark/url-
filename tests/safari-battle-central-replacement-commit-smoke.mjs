import "./safari-boundary-battle-end-to-end-smoke.mjs";
import assert from "node:assert/strict";
import {
  SAFARI_BATTLE_PHASE,
  abortSafariBattleCommand,
  beginSafariBattleCommand,
  commitSafariBattleResolution,
  ensureSafariBattleOrchestrator,
} from "../runtime/safari-battle-orchestrator.js";

function runtime() {
  return {
    variables: {
      mapless: {
        battle: {
          kind: "trainer",
          turn: 2,
          decision: 0,
          completed: false,
        },
      },
    },
  };
}

function reserveKoResult() {
  return {
    decision: 0,
    foeReplacementRequired: true,
    foeReplacementApplied: false,
    operations: [
      { op: "use_move", actor: "player" },
      { op: "faint", target: "foe" },
    ],
    expIntegration: {
      commits: [{ deferred: true, operations: [], battleExpInput: {} }],
    },
  };
}

{
  const rt = runtime();
  const battle = rt.variables.mapless.battle;
  ensureSafariBattleOrchestrator(rt);
  beginSafariBattleCommand(rt, "move");
  const result = reserveKoResult();
  let replacementCommits = 0;
  let growthCommits = 0;

  const committed = commitSafariBattleResolution(rt, result, "move", {
    replacementCommit(current) {
      replacementCommits += 1;
      assert.equal(battle.phase, SAFARI_BATTLE_PHASE.REPLACEMENT,
        "canonical trainer replacement must mutate state only after the central REPLACEMENT checkpoint is entered");
      assert.equal(current.foeReplacementRequired, true);
      assert.equal(current.foeReplacementApplied, false);
      return {
        ...current,
        foeReplacementRequired: false,
        foeReplacementApplied: true,
      };
    },
    rewardGrowthCommit(current) {
      growthCommits += 1;
      assert.equal(battle.phase, SAFARI_BATTLE_PHASE.REWARD_GROWTH,
        "trainer reserve EXP must remain after the replacement mutation checkpoint");
      assert.equal(current.foeReplacementApplied, true);
      return current;
    },
  });

  assert.equal(replacementCommits, 1);
  assert.equal(growthCommits, 1);
  assert.equal(committed.foeReplacementApplied, true);
  assert.equal(battle.completed, false);
  assert.equal(battle.replacement_checkpoint?.committed, true);
  assert.deepEqual(
    battle.phase_trace.slice(-4).map((step) => step.phase),
    ["POST_FAINT", "REPLACEMENT", "REWARD_GROWTH", "COMMAND"],
  );

  const traceLength = battle.phase_trace.length;
  commitSafariBattleResolution(rt, structuredClone(result), "move", {
    replacementCommit() {
      replacementCommits += 1;
      throw new Error("replacement replay must never execute");
    },
    rewardGrowthCommit() {
      growthCommits += 1;
      throw new Error("growth replay must never execute");
    },
  });
  assert.equal(replacementCommits, 1,
    "compatibility replay must not invoke the canonical replacement/switch owner twice");
  assert.equal(growthCommits, 1,
    "compatibility replay must not invoke replacement EXP growth twice");
  assert.equal(battle.phase_trace.length, traceLength,
    "replacement replay must not append duplicate REPLACEMENT/REWARD_GROWTH phases");
}

{
  const rt = runtime();
  const battle = rt.variables.mapless.battle;
  battle.player_replacement_required = true;
  battle.player_party_index = 0;
  ensureSafariBattleOrchestrator(rt);
  beginSafariBattleCommand(rt, "move");
  const result = {
    ...reserveKoResult(),
    playerReplacementRequired: true,
    operations: [
      { op: "use_move", actor: "player" },
      { op: "faint", target: "foe" },
      { op: "faint_self", target: "player" },
    ],
  };
  let replacementCommits = 0;
  const committed = commitSafariBattleResolution(rt, result, "move", {
    replacementCommit(current) {
      replacementCommits += 1;
      assert.equal(battle.phase, SAFARI_BATTLE_PHASE.REPLACEMENT,
        "simultaneous reserves must still commit the automatic foe switch inside REPLACEMENT");
      return { ...current, foeReplacementRequired: false, foeReplacementApplied: true };
    },
  });
  assert.equal(replacementCommits, 1);
  assert.equal(committed.foeReplacementApplied, true);
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.REPLACEMENT,
    "after automatic foe replacement, player replacement selection must keep the Battle at REPLACEMENT");
  assert.equal(battle.completed, false);
  assert.equal(battle.pending_reward_growth?.recipientPartyIndex, 0,
    "simultaneous replacement must preserve the defeated player EXP recipient until player replacement completes");
  assert.equal(battle.phase_trace.filter((step) => step.phase === SAFARI_BATTLE_PHASE.REPLACEMENT).length, 1,
    "simultaneous replacement must expose one central REPLACEMENT checkpoint");
}

{
  const rt = runtime();
  const battle = rt.variables.mapless.battle;
  ensureSafariBattleOrchestrator(rt);
  beginSafariBattleCommand(rt, "move");
  const result = reserveKoResult();
  let replacementAttempts = 0;

  assert.throws(() => commitSafariBattleResolution(rt, result, "move", {
    replacementCommit() {
      replacementAttempts += 1;
      throw new Error("replacement exploded:test");
    },
  }), /replacement exploded:test/);
  assert.equal(replacementAttempts, 1);
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.REPLACEMENT);
  assert.equal(battle.completed, false);
  assert.equal(battle.replacement_checkpoint?.committed, false);
  assert.equal(battle.replacement_checkpoint?.errorMessage, "replacement exploded:test");
  assert.equal(abortSafariBattleCommand(rt, "compatibility wrapper caught replacement failure"), SAFARI_BATTLE_PHASE.REPLACEMENT,
    "command abort must not rewind a failed post-faint replacement commit");

  const traceLength = battle.phase_trace.length;
  assert.throws(() => commitSafariBattleResolution(rt, result, "move", {
    replacementCommit() {
      replacementAttempts += 1;
      return { ...result, foeReplacementRequired: false, foeReplacementApplied: true };
    },
  }), /replacement checkpoint is incomplete and cannot be replayed/);
  assert.equal(replacementAttempts, 1,
    "a partially failed replacement mutation must fail closed instead of running switch twice");
  assert.equal(battle.phase_trace.length, traceLength);
}

console.log("safari central trainer replacement commit smoke: PASS");
