import assert from "node:assert/strict";
import fs from "node:fs";
import {
  SAFARI_BATTLE_PHASE,
  beginSafariBattleCommand,
  commitSafariBattleResolution,
  ensureSafariBattleOrchestrator,
  safariBattleCommandAllowed,
} from "../runtime/safari-battle-orchestrator.js";
import {
  captureSafariBattlePresentationAckSequence,
  completeSafariBattlePresentationForSequence,
} from "../runtime/safari-battle-presentation-ack.js";

function runtime() {
  return {
    variables: {
      mapless: {
        battle: {
          turn: 1,
          decision: 0,
          completed: false,
          presentation_ack_required: true,
        },
      },
    },
  };
}

for (const commandKind of ["item", "capture", "flee", "switch"]) {
  const state = runtime();
  const battle = state.variables.mapless.battle;
  ensureSafariBattleOrchestrator(state);
  beginSafariBattleCommand(state, commandKind);
  commitSafariBattleResolution(state, {
    decision: 0,
    turnConsumed: true,
    operations: [{ op: "use_move", actor: "foe", target: "player" }],
  }, commandKind);

  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.CHECK_2,
    `${commandKind} must keep COMMAND closed while foe-response presentation is pending`);
  assert.equal(safariBattleCommandAllowed(state), false,
    `${commandKind} must reject another command before presentation acknowledgement`);
  assert.equal(battle.presentation_checkpoint?.committed, false);

  const sequence = captureSafariBattlePresentationAckSequence(state);
  completeSafariBattlePresentationForSequence(state, sequence);
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.COMMAND,
    `${commandKind} presentation acknowledgement must publish COMMAND`);
  assert.equal(safariBattleCommandAllowed(state), true);
}

{
  const state = runtime();
  const battle = state.variables.mapless.battle;
  ensureSafariBattleOrchestrator(state);

  beginSafariBattleCommand(state, "move");
  commitSafariBattleResolution(state, {
    decision: 0,
    operations: [
      { op: "use_move", actor: "player", target: "foe" },
      { op: "use_move", actor: "foe", target: "player" },
    ],
  }, "move");
  const firstSequence = captureSafariBattlePresentationAckSequence(state);
  const forgedSequence = Object.freeze({
    battle,
    checkpoint: battle.presentation_checkpoint,
    sequence: firstSequence.sequence,
  });
  const traceLengthBeforeForgedAck = battle.phase_trace.length;
  assert.throws(
    () => completeSafariBattlePresentationForSequence(state, forgedSequence),
    /token issued by the central capture owner/,
    "presentation acknowledgement must not accept an ad-hoc token assembled from live Battle state",
  );
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.CHECK_2);
  assert.equal(battle.phase_trace.length, traceLengthBeforeForgedAck,
    "forged acknowledgement rejection must not mutate the central phase trace");
  completeSafariBattlePresentationForSequence(state, firstSequence);
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.COMMAND);

  beginSafariBattleCommand(state, "move");
  commitSafariBattleResolution(state, {
    decision: 0,
    operations: [
      { op: "use_move", actor: "foe", target: "player" },
      { op: "use_move", actor: "player", target: "foe" },
    ],
  }, "move");
  const secondSequence = captureSafariBattlePresentationAckSequence(state);
  assert.notEqual(secondSequence.sequence, firstSequence.sequence);
  const traceLengthBeforeStaleAck = battle.phase_trace.length;

  assert.throws(
    () => completeSafariBattlePresentationForSequence(state, firstSequence),
    /stale battle presentation acknowledgement/,
    "a delayed presentation callback must not acknowledge a newer command checkpoint",
  );
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.CHECK_2);
  assert.equal(battle.phase_trace.length, traceLengthBeforeStaleAck,
    "stale presentation acknowledgement must not mutate central phase trace");
  assert.equal(safariBattleCommandAllowed(state), false);

  completeSafariBattlePresentationForSequence(state, secondSequence);
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
  const commandCount = battle.phase_trace.filter((entry) => entry.phase === SAFARI_BATTLE_PHASE.COMMAND).length;
  completeSafariBattlePresentationForSequence(state, secondSequence);
  assert.equal(
    battle.phase_trace.filter((entry) => entry.phase === SAFARI_BATTLE_PHASE.COMMAND).length,
    commandCount,
    "same-sequence acknowledgement replay must remain idempotent",
  );
}

{
  const state = runtime();
  const battle = state.variables.mapless.battle;
  ensureSafariBattleOrchestrator(state);
  beginSafariBattleCommand(state, "move");
  commitSafariBattleResolution(state, {
    decision: 0,
    operations: [
      { op: "use_move", actor: "player", target: "foe" },
      { op: "use_move", actor: "foe", target: "player" },
    ],
  }, "move");
  const token = captureSafariBattlePresentationAckSequence(state);
  const originalCheckpoint = battle.presentation_checkpoint;
  battle.presentation_checkpoint = {
    ...structuredClone(originalCheckpoint),
    committed: false,
  };
  assert.equal(battle.presentation_checkpoint.sequence, token.sequence,
    "a replacement checkpoint may reuse the same command sequence while still being a different central checkpoint");
  const traceLengthBeforeCheckpointSwapAck = battle.phase_trace.length;
  assert.throws(
    () => completeSafariBattlePresentationForSequence(state, token),
    /different presentation checkpoint/,
    "a captured acknowledgement must not unlock a replacement checkpoint just because battle and sequence still match",
  );
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.CHECK_2);
  assert.equal(battle.phase_trace.length, traceLengthBeforeCheckpointSwapAck,
    "checkpoint-identity rejection must leave the central phase trace unchanged");
  assert.equal(safariBattleCommandAllowed(state), false);
}

{
  const state = runtime();
  const firstBattle = state.variables.mapless.battle;
  ensureSafariBattleOrchestrator(state);
  beginSafariBattleCommand(state, "move");
  commitSafariBattleResolution(state, {
    decision: 0,
    operations: [
      { op: "use_move", actor: "player", target: "foe" },
      { op: "use_move", actor: "foe", target: "player" },
    ],
  }, "move");
  const firstBattleSequence = captureSafariBattlePresentationAckSequence(state);
  assert.equal(firstBattleSequence.sequence, 1);

  const secondBattle = {
    turn: 1,
    decision: 0,
    completed: false,
    presentation_ack_required: true,
  };
  state.variables.mapless.battle = secondBattle;
  ensureSafariBattleOrchestrator(state);
  beginSafariBattleCommand(state, "move");
  commitSafariBattleResolution(state, {
    decision: 0,
    operations: [
      { op: "use_move", actor: "foe", target: "player" },
      { op: "use_move", actor: "player", target: "foe" },
    ],
  }, "move");
  const secondBattleSequence = captureSafariBattlePresentationAckSequence(state);
  assert.equal(secondBattleSequence.sequence, 1,
    "fresh battles may legitimately reuse the same command sequence number");
  assert.notEqual(firstBattleSequence.battle, secondBattleSequence.battle);
  assert.equal(firstBattleSequence.battle, firstBattle);

  const traceLengthBeforeCrossBattleAck = secondBattle.phase_trace.length;
  assert.throws(
    () => completeSafariBattlePresentationForSequence(state, firstBattleSequence),
    /different battle instance/,
    "a delayed callback from a previous battle must not acknowledge the next battle even when command sequence numbers match",
  );
  assert.equal(secondBattle.phase, SAFARI_BATTLE_PHASE.CHECK_2);
  assert.equal(secondBattle.phase_trace.length, traceLengthBeforeCrossBattleAck,
    "cross-battle stale acknowledgement must not mutate the new battle phase trace");
  assert.equal(safariBattleCommandAllowed(state), false);

  completeSafariBattlePresentationForSequence(state, secondBattleSequence);
  assert.equal(secondBattle.phase, SAFARI_BATTLE_PHASE.COMMAND);
}

const ownerFiles = [
  ["item", "../game-menu-bridge.js", "let bagUseBusy"],
  ["capture", "../battle-dppt-capture-owner-request.js", "captureBusy"],
  ["flee", "../battle-dppt-flee-owner-request.js", "fleeBusy"],
  ["switch", "../battle-party-voluntary-switch-bridge.js", "let selecting"],
  ["forced replacement", "../battle-player-replacement-presentation.js", "let selecting"],
];
for (const [name, relativePath, legacyGate] of ownerFiles) {
  const source = fs.readFileSync(new URL(relativePath, import.meta.url), "utf8");
  assert.match(source, /captureSafariBattlePresentationAckSequence\s*\(/,
    `${name} presentation owner must capture the central command sequence before asynchronous presentation completion`);
  assert.match(source, /completeSafariBattlePresentationForSequence\s*\(/,
    `${name} presentation owner must acknowledge only its captured central command sequence`);
  assert.equal(source.includes(legacyGate), false,
    `${name} must not retain ${legacyGate} as a parallel Battle command-readiness truth`);
  assert.match(source, /\.phase\s*!==\s*"COMMAND"|phase\s*===\s*"COMMAND"|REPLACEMENT_PHASE/,
    `${name} readiness must remain derived from the central Battle phase`);
  if (name === "capture" || name === "flee") {
    assert.doesNotMatch(source, /dataset\.dpptMenu\s*=\s*["']locked["']/,
      `${name} owner must not create a parallel DPt lock before the central phase transition`);
  }
}

console.log("Safari DPt Battle presentation acknowledgement owner smoke passed");
