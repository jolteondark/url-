import "./safari-boundary-battle-end-to-end-smoke.mjs";
import assert from "node:assert/strict";
import {
  SAFARI_BATTLE_PHASE,
  abortSafariBattleCommand,
  beginSafariBattleCommand,
  captureSafariBattleReplacementCommit,
  commitSafariBattleResolution,
  completeSafariBattleReplacement,
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

function enterPlayerReplacement(rt) {
  const battle = rt.variables.mapless.battle;
  battle.player_replacement_required = true;
  battle.player_party_index = 0;
  ensureSafariBattleOrchestrator(rt);
  beginSafariBattleCommand(rt, "move");
  commitSafariBattleResolution(rt, {
    decision: 0,
    playerReplacementRequired: true,
    operations: [
      { op: "use_move", actor: "foe" },
      { op: "faint", target: "player" },
    ],
  }, "move");
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.REPLACEMENT);
  return battle;
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

{
  const rt = runtime();
  const battle = enterPlayerReplacement(rt);
  const replacementCommitToken = captureSafariBattleReplacementCommit(rt, "player");
  let playerCommits = 0;
  const completed = completeSafariBattleReplacement(rt, {
    result: "replacement_selected",
    playerReplacementRequired: true,
    playerReplacementApplied: false,
    operations: [{ op: "send_out", actor: "player" }],
  }, {
    replacementCommitToken,
    replacementCommit(current) {
      playerCommits += 1;
      assert.equal(battle.phase, SAFARI_BATTLE_PHASE.REPLACEMENT,
        "forced player switch must mutate Party state only inside the central REPLACEMENT checkpoint");
      battle.player_replacement_required = false;
      return {
        ...current,
        result: "replaced",
        playerReplacementRequired: false,
        playerReplacementApplied: true,
      };
    },
  });
  assert.equal(playerCommits, 1);
  assert.equal(completed.result, "replaced");
  assert.equal(completed.playerReplacementApplied, true);
  assert.equal(battle.replacement_checkpoint?.side, "player");
  assert.equal(battle.replacement_checkpoint?.committed, true);
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
  assert.deepEqual(
    battle.phase_trace.slice(-2).map((step) => step.phase),
    ["REPLACEMENT", "COMMAND"],
    "player replacement mutation must be the REPLACEMENT checkpoint immediately before the next COMMAND",
  );
}

{
  const rt = runtime();
  const battle = enterPlayerReplacement(rt);
  const replacementCommitToken = captureSafariBattleReplacementCommit(rt, "player");
  let attempts = 0;
  assert.throws(() => completeSafariBattleReplacement(rt, {
    result: "replacement_selected",
    playerReplacementRequired: true,
  }, {
    replacementCommitToken,
    replacementCommit() {
      attempts += 1;
      throw new Error("player replacement exploded:test");
    },
  }), /player replacement exploded:test/);
  assert.equal(attempts, 1);
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.REPLACEMENT);
  assert.equal(battle.replacement_checkpoint?.side, "player");
  assert.equal(battle.replacement_checkpoint?.committed, false);
  assert.throws(() => completeSafariBattleReplacement(rt, {
    result: "replacement_selected",
    playerReplacementRequired: true,
  }, {
    replacementCommitToken,
    replacementCommit() {
      attempts += 1;
      return { playerReplacementRequired: false, playerReplacementApplied: true };
    },
  }), /replacement checkpoint is incomplete and cannot be replayed/);
  assert.equal(attempts, 1,
    "partially failed player replacement must fail closed instead of mutating Party twice");
}

{
  const rtA = runtime();
  const battleA = enterPlayerReplacement(rtA);
  const tokenA = captureSafariBattleReplacementCommit(rtA, "player");
  const rtB = runtime();
  const battleB = enterPlayerReplacement(rtB);
  const tokenB = captureSafariBattleReplacementCommit(rtB, "player");
  let commits = 0;

  assert.equal(battleA.command_sequence, battleB.command_sequence,
    "cross-Battle regression must reuse the same command sequence to prove Battle identity is required");
  const traceLength = battleB.phase_trace.length;
  assert.throws(() => completeSafariBattleReplacement(rtB, {
    result: "replacement_selected",
    playerReplacementRequired: true,
  }, {
    replacementCommitToken: tokenA,
    replacementCommit() {
      commits += 1;
      battleB.player_replacement_required = false;
      return { playerReplacementRequired: false, playerReplacementApplied: true };
    },
  }), /different battle instance/);
  assert.equal(commits, 0,
    "stale replacement capability must fail before the Party/switch owner mutates state");
  assert.equal(battleB.phase, SAFARI_BATTLE_PHASE.REPLACEMENT);
  assert.equal(battleB.replacement_checkpoint, null,
    "stale replacement capability must not create a replacement commit checkpoint");
  assert.equal(battleB.phase_trace.length, traceLength,
    "stale replacement capability must not advance central phases");

  const forged = {
    battle: battleB,
    battleInstanceSequence: battleB.orchestrator_battle_instance_sequence,
    resolutionCheckpoint: battleB.resolution_checkpoint,
    sequence: battleB.command_sequence,
    side: "player",
  };
  assert.throws(() => completeSafariBattleReplacement(rtB, {
    result: "replacement_selected",
    playerReplacementRequired: true,
  }, {
    replacementCommitToken: forged,
    replacementCommit() {
      commits += 1;
      return { playerReplacementRequired: false, playerReplacementApplied: true };
    },
  }), /token issued by the central orchestrator/);
  assert.equal(commits, 0,
    "field-equivalent ad-hoc capability must not bypass central issuance");

  const completed = completeSafariBattleReplacement(rtB, {
    result: "replacement_selected",
    playerReplacementRequired: true,
  }, {
    replacementCommitToken: tokenB,
    replacementCommit(current) {
      commits += 1;
      battleB.player_replacement_required = false;
      return { ...current, playerReplacementRequired: false, playerReplacementApplied: true };
    },
  });
  assert.equal(commits, 1);
  assert.equal(completed.playerReplacementApplied, true);
}

console.log("safari central trainer/player replacement commit smoke: PASS");
