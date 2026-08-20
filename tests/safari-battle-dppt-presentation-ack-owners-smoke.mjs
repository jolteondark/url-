import assert from "node:assert/strict";
import fs from "node:fs";
import {
  SAFARI_BATTLE_PHASE,
  beginSafariBattleCommand,
  commitSafariBattleResolution,
  completeSafariBattlePresentation,
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

  completeSafariBattlePresentation(state);
  assert.equal(battle.phase, SAFARI_BATTLE_PHASE.COMMAND,
    `${commandKind} presentation acknowledgement must publish COMMAND`);
  assert.equal(safariBattleCommandAllowed(state), true);
}

const ownerFiles = [
  ["item", "../game-menu-bridge.js", "let bagUseBusy"],
  ["capture", "../battle-dppt-capture-owner-request.js", "captureBusy"],
  ["flee", "../battle-dppt-flee-owner-request.js", "fleeBusy"],
  ["switch", "../battle-party-voluntary-switch-bridge.js", "let selecting"],
];
for (const [name, relativePath, legacyGate] of ownerFiles) {
  const source = fs.readFileSync(new URL(relativePath, import.meta.url), "utf8");
  assert.match(source, /completeSafariBattlePresentation\s*\(/,
    `${name} presentation owner must acknowledge the central presentation checkpoint`);
  assert.equal(source.includes(legacyGate), false,
    `${name} must not retain ${legacyGate} as a parallel Battle command-readiness truth`);
  assert.match(source, /\.phase\s*!==\s*"COMMAND"|phase\s*===\s*"COMMAND"/,
    `${name} readiness must be derived from central COMMAND phase`);
}

const previewSource = fs.readFileSync(new URL("../preview-app.js", import.meta.url), "utf8");
const previewBattleHandlers = previewSource.slice(
  previewSource.indexOf('byId("moves").addEventListener'),
  previewSource.indexOf('byId("return-board").addEventListener'),
);
assert.match(previewSource, /completeSafariBattlePresentation\s*\(/,
  "preview Battle presentation must acknowledge the central presentation checkpoint");
assert.equal(/\bbusy\b/.test(previewBattleHandlers), false,
  "preview move/capture/flee handlers must not retain local busy as Battle command truth");

console.log("Safari DPt Battle presentation acknowledgement owner smoke passed");