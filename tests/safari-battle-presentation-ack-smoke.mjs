import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SAFARI_BATTLE_PHASE,
  beginSafariBattleCommand,
  commitSafariBattleResolution,
  completeSafariBattlePresentation,
  completeSafariBattleReplacement,
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
          presentation_ack_required: true,
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
  beginSafariBattleCommand(state, "move");
  const result = commitSafariBattleResolution(state, {
    decision: 0,
    operations: [
      { op: "use_move", actor: "player", target: "foe" },
      { op: "use_move", actor: "foe", target: "player" },
    ],
  }, "move");

  assert.equal(result.phase, SAFARI_BATTLE_PHASE.CHECK_2);
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.CHECK_2,
    "resolved nonterminal move must stay non-COMMAND while presentation is pending");
  assert.equal(safariBattleCommandAllowed(state), false,
    "COMMAND must stay unavailable until presentation completion is acknowledged");
  assert.equal(battle.presentation_checkpoint?.committed, false);

  const commandCountBeforeAck = phaseCount(battle, SAFARI_BATTLE_PHASE.COMMAND);
  assert.equal(completeSafariBattlePresentation(state), SAFARI_BATTLE_PHASE.COMMAND);
  assert.equal(safariBattleCommandAllowed(state), true);
  assert.equal(battle.presentation_checkpoint?.committed, true);
  assert.equal(phaseCount(battle, SAFARI_BATTLE_PHASE.COMMAND), commandCountBeforeAck + 1,
    "presentation acknowledgement must publish COMMAND exactly once");

  completeSafariBattlePresentation(state);
  assert.equal(phaseCount(battle, SAFARI_BATTLE_PHASE.COMMAND), commandCountBeforeAck + 1,
    "presentation acknowledgement replay must not publish a second COMMAND");
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

  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.CHECK_2,
    "consumed Bag command must keep COMMAND closed through the foe response presentation");
  const checks = battle.phase_trace.filter((entry) => entry.phase === SAFARI_BATTLE_PHASE.CHECK_1 || entry.phase === SAFARI_BATTLE_PHASE.CHECK_2);
  assert.deepEqual(checks.map((entry) => entry.actor), ["player", "foe"]);
  completeSafariBattlePresentation(state);
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
}

{
  const state = runtime();
  const battle = state.variables.mapless.battle;
  ensureSafariBattleOrchestrator(state);
  beginSafariBattleCommand(state, "move");
  let replacementCommits = 0;
  commitSafariBattleResolution(state, {
    decision: 0,
    foeReplacementRequired: true,
    operations: [
      { op: "use_move", actor: "player", target: "foe" },
      { op: "faint", actor: "player", target: "foe" },
    ],
  }, "move", {
    replacementCommit: (current) => {
      replacementCommits += 1;
      return {
        ...current,
        foeReplacementRequired: true,
        foeReplacementApplied: true,
        operations: [...current.operations, { op: "send_out", actor: "foe" }],
      };
    },
  });

  assert.equal(replacementCommits, 1);
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.REPLACEMENT,
    "trainer reserve must remain at the central replacement/presentation boundary before COMMAND");
  assert.equal(safariBattleCommandAllowed(state), false);
  completeSafariBattlePresentation(state);
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
}

{
  const state = runtime();
  const battle = state.variables.mapless.battle;
  ensureSafariBattleOrchestrator(state);
  beginSafariBattleCommand(state, "move");
  commitSafariBattleResolution(state, {
    decision: 0,
    playerReplacementRequired: true,
    operations: [
      { op: "use_move", actor: "foe", target: "player" },
      { op: "faint", actor: "foe", target: "player" },
    ],
  }, "move");
  battle.player_replacement_required = true;

  let replacementCommits = 0;
  const result = completeSafariBattleReplacement(state, {
    playerReplacementRequired: true,
    operations: [],
  }, {
    replacementCommit: (current) => {
      replacementCommits += 1;
      battle.player_replacement_required = false;
      return {
        ...current,
        playerReplacementRequired: false,
        playerReplacementApplied: true,
        operations: [{ op: "send_out", actor: "player" }],
      };
    },
  });

  assert.equal(replacementCommits, 1);
  assert.equal(result.phase, SAFARI_BATTLE_PHASE.REPLACEMENT,
    "forced player replacement must not expose COMMAND before its presentation acknowledgement");
  assert.equal(battle.presentation_checkpoint?.committed, false);
  assert.equal(safariBattleCommandAllowed(state), false);

  const commandCountBeforeAck = phaseCount(battle, SAFARI_BATTLE_PHASE.COMMAND);
  completeSafariBattlePresentation(state);
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
  assert.equal(safariBattleCommandAllowed(state), true);
  assert.equal(phaseCount(battle, SAFARI_BATTLE_PHASE.COMMAND), commandCountBeforeAck + 1,
    "forced replacement presentation acknowledgement must publish COMMAND exactly once");
  completeSafariBattlePresentation(state);
  assert.equal(phaseCount(battle, SAFARI_BATTLE_PHASE.COMMAND), commandCountBeforeAck + 1);
}

{
  const state = runtime();
  const battle = state.variables.mapless.battle;
  ensureSafariBattleOrchestrator(state);
  beginSafariBattleCommand(state, "move");
  commitSafariBattleResolution(state, {
    decision: 1,
    operations: [
      { op: "use_move", actor: "player", target: "foe" },
      { op: "faint", actor: "player", target: "foe" },
    ],
  }, "move");

  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.RESULT);
  assert.equal(battle.completed, true);
  assert.equal(battle.presentation_checkpoint ?? null, null,
    "terminal RESULT must not create a COMMAND-resume presentation checkpoint");
  assert.equal(completeSafariBattlePresentation(state), SAFARI_BATTLE_PHASE.RESULT,
    "terminal presentation acknowledgement must never skip explicit RESULT -> RETURN");
}

{
  const source = readFileSync(new URL("../preview-app.js", import.meta.url), "utf8");
  const block = (start, end) => {
    const startIndex = source.indexOf(start);
    const endIndex = source.indexOf(end, startIndex + start.length);
    assert.notEqual(startIndex, -1, `missing ${start} handler`);
    assert.notEqual(endIndex, -1, `missing ${end} boundary`);
    return source.slice(startIndex, endIndex);
  };

  const moveHandler = block('byId("moves").addEventListener', 'byId("capture").addEventListener');
  const captureHandler = block('byId("capture").addEventListener', 'byId("flee").addEventListener');
  const fleeHandler = block('byId("flee").addEventListener', 'byId("return-board").addEventListener');

  for (const [name, handler] of [["move", moveHandler], ["capture", captureHandler], ["flee", fleeHandler]]) {
    assert.doesNotMatch(handler, /\bbusy\b/,
      `${name} preview handler must not use the broad preview busy flag as Battle command truth`);
    assert.match(handler, /battleCommandAllowed\(\)/,
      `${name} preview handler must derive readiness from central COMMAND phase`);
  }
  assert.equal((fleeHandler.match(/battleCommandAllowed\(\)/g) ?? []).length, 2,
    "lazy flee import must re-check central COMMAND immediately before invoking the command owner");

  const readinessOwner = source.match(/function battleCommandAllowed\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(readinessOwner, /battle\?\.phase === "COMMAND"/);
  assert.doesNotMatch(readinessOwner, /busy|completed|Replacement/,
    "root preview Battle readiness must have no second truth beside COMMAND");

  const presentationOwner = source.match(/async function playPresentation\(events\) \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(presentationOwner, /captureSafariBattlePresentationAckSequence\(runtime\)/,
    "root preview presentation owner must capture the central ack token before animation awaits");
  assert.match(presentationOwner, /completeSafariBattlePresentationForSequence\(runtime,\s*presentationAckToken\)/,
    "root preview presentation owner must acknowledge only the token captured for that presentation");
  assert.doesNotMatch(presentationOwner, /completeSafariBattlePresentation\(runtime\)/,
    "root preview presentation owner must not bypass stale-callback protection with tokenless acknowledgement");
  assert.match(presentationOwner, /phaseAfterAck !== phaseBeforeAck[\s\S]*safari-runtime-changed/,
    "a phase-changing presentation acknowledgement must publish runtime change so DPt command UI can leave locked state");
}

{
  const source = readFileSync(new URL("../battle-player-replacement-presentation.js", import.meta.url), "utf8");
  assert.match(source, /completeSafariBattlePresentation/,
    "forced player replacement presentation must acknowledge the central presentation checkpoint");
  assert.doesNotMatch(source, /let selecting\b|\bselecting\s*=/,
    "forced player replacement must not keep a local selecting readiness truth");
  assert.match(source, /presentation_checkpoint\?\.committed !== false/,
    "replacement selection must stop while the central replacement presentation checkpoint is pending");
}

await import("./safari-battle-dppt-presentation-ack-owners-smoke.mjs");
await import("./safari-battle-persistence-phase-lock-smoke.mjs");
console.log("Safari Battle presentation acknowledgement smoke passed");