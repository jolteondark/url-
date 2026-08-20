import assert from "node:assert/strict";
import fs from "node:fs";
import "./safari-battle-orchestrator-phase-smoke.mjs";
import {
  SAFARI_BATTLE_PHASE,
  beginSafariBattleCommand,
  beginSafariBattleReturn,
  commitSafariBattleResolution,
  completeSafariBattleReplacement,
  ensureSafariBattleOrchestrator,
} from "../runtime/safari-battle-orchestrator.js";

function runtime(battle = {}) {
  return {
    variables: {
      mapless: {
        battle: {
          turn: 1,
          decision: 0,
          completed: false,
          kind: "wild",
          origin: "day_board",
          ...battle,
        },
      },
    },
  };
}

// Wild KO -> post-victory/reward growth -> RESULT -> RETURN.
{
  const rt = runtime();
  ensureSafariBattleOrchestrator(rt);
  beginSafariBattleCommand(rt, "move");
  commitSafariBattleResolution(rt, {
    decision: 1,
    operations: [
      { op: "use_move", actor: "player" },
      { op: "faint", target: "foe" },
      { op: "gain_exp", amount: 87 },
      { op: "level_up", level: 12 },
      { op: "learn_move", move: "QUICKATTACK" },
      { op: "level_evolution", from: "A", to: "B" },
      { op: "item_received", item: "POTION" },
      { op: "trainer_prize_money", applied: 300 },
    ],
  }, "move");
  const phases = rt.variables.mapless.battle.phase_trace.map((step) => step.phase);
  assert.deepEqual(phases, [
    "COMMAND", "ACTION_1", "CHECK_1", "POST_FAINT",
    "POST_VICTORY", "REWARD_GROWTH", "RESULT",
  ]);
  assert.equal(rt.variables.mapless.battle.phase, SAFARI_BATTLE_PHASE.RESULT);
  beginSafariBattleReturn(rt);
  assert.equal(rt.variables.mapless.battle.phase, SAFARI_BATTLE_PHASE.RETURN);
}

// Trainer reserve: expose REPLACEMENT checkpoint, then return to COMMAND without RESULT.
{
  const rt = runtime({ kind: "trainer" });
  ensureSafariBattleOrchestrator(rt);
  beginSafariBattleCommand(rt, "move");
  commitSafariBattleResolution(rt, {
    decision: 0,
    foeReplacementApplied: true,
    operations: [{ op: "use_move", actor: "player" }, { op: "faint", target: "foe" }],
  }, "move");
  const phases = rt.variables.mapless.battle.phase_trace.map((step) => step.phase);
  assert.deepEqual(phases.slice(-3), ["POST_FAINT", "REPLACEMENT", "COMMAND"]);
  assert.equal(phases.includes("RESULT"), false);
  assert.equal(rt.variables.mapless.battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
}

// Player KO: REPLACEMENT remains authoritative until the replacement owner completes it.
{
  const rt = runtime();
  ensureSafariBattleOrchestrator(rt);
  beginSafariBattleCommand(rt, "move");
  commitSafariBattleResolution(rt, {
    decision: 0,
    playerReplacementRequired: true,
    operations: [{ op: "use_move", actor: "foe" }, { op: "faint", target: "player" }],
  }, "move");
  assert.equal(rt.variables.mapless.battle.phase, SAFARI_BATTLE_PHASE.REPLACEMENT);
  rt.variables.mapless.battle.player_replacement_required = false;
  completeSafariBattleReplacement(rt, {});
  assert.equal(rt.variables.mapless.battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
}

// Item/capture/flee/switch consume ACTION_1; one living-foe response is ACTION_2/CHECK_2.
for (const kind of ["item", "capture", "flee", "switch"]) {
  const rt = runtime();
  ensureSafariBattleOrchestrator(rt);
  beginSafariBattleCommand(rt, kind);
  assert.equal(rt.variables.mapless.battle.phase, SAFARI_BATTLE_PHASE.ACTION_1);
  assert.throws(() => beginSafariBattleCommand(rt, kind), /unavailable during ACTION_1/,
    `${kind} double tap must be rejected by the orchestrator`);
  commitSafariBattleResolution(rt, {
    decision: 0,
    operations: [{ op: "use_move", actor: "foe" }],
  }, kind);
  const phases = rt.variables.mapless.battle.phase_trace.map((step) => step.phase);
  assert.ok(phases.includes("ACTION_2"), `${kind} foe response must be ACTION_2`);
  assert.ok(phases.includes("CHECK_2"), `${kind} foe response must be CHECK_2`);
  assert.equal(rt.variables.mapless.battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
}

// A rejected/non-consuming Bag command must never become a committed ACTION/CHECK.
{
  const rt = runtime();
  ensureSafariBattleOrchestrator(rt);
  beginSafariBattleCommand(rt, "item");
  const rejected = {
    result: "no_effect",
    turnConsumed: false,
    operations: [],
  };
  commitSafariBattleResolution(rt, rejected, "item");
  const phases = rt.variables.mapless.battle.phase_trace.map((step) => step.phase);
  assert.deepEqual(phases, ["COMMAND", "COMMAND"],
    "an unconsumed command must roll the speculative ACTION_1 back before returning to COMMAND");
  assert.equal(phases.includes("CHECK_1"), false);
  assert.equal(phases.includes("ACTION_2"), false);
  assert.equal(rt.variables.mapless.battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
  assert.equal(rt.variables.mapless.battle.pending_command_kind, null);
  assert.equal(rejected.phase, SAFARI_BATTLE_PHASE.COMMAND);
}

const adapterSource = fs.readFileSync(new URL("../battle-phase-ui-adapter.js", import.meta.url), "utf8");
const legacySource = fs.readFileSync(new URL("../battle-turn-phase-presentation.js", import.meta.url), "utf8");
const replacementSource = fs.readFileSync(new URL("../battle-player-replacement-presentation.js", import.meta.url), "utf8");
const bagSource = fs.readFileSync(new URL("../game-menu-bridge.js", import.meta.url), "utf8");
const flowPolishSource = fs.readFileSync(new URL("../battle-dppt-flow-polish.js", import.meta.url), "utf8");
const menuFlowGuardSource = fs.readFileSync(new URL("../battle-dppt-menu-flow-guard.js", import.meta.url), "utf8");
const commandMenuSource = fs.readFileSync(new URL("../battle-dppt-command-menu.js", import.meta.url), "utf8");
const captureOwnerSource = fs.readFileSync(new URL("../battle-dppt-capture-owner-request.js", import.meta.url), "utf8");
const previewSource = fs.readFileSync(new URL("../preview-app.js", import.meta.url), "utf8");
const indexSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const previewBattleRenderSource = previewSource.match(/function renderMoves[\s\S]*?function render\(\)/)?.[0] ?? "";

for (const phase of [
  "COMMAND", "ACTION_1", "CHECK_1", "ACTION_2", "CHECK_2", "POST_FAINT",
  "REPLACEMENT", "POST_VICTORY", "REWARD_GROWTH", "RESULT", "RETURN",
]) assert.match(adapterSource, new RegExp(`\\b${phase}\\b`));

assert.match(adapterSource, /const commandAllowed = phase === COMMAND_PHASE/);
assert.match(adapterSource, /const replacementAllowed = phase === REPLACEMENT_PHASE/);
assert.match(adapterSource, /const resultReady = phase === RESULT_PHASE/);
assert.match(adapterSource, /Number\(currentBattle\?\.decision\) === 1 \? "Victory" : "Battle End"/,
  "loss terminals may share the POST_VICTORY compatibility checkpoint but must not render victory copy");
assert.match(adapterSource, /Number\(currentBattle\?\.decision\) === 1 \? "勝利処理中…" : "戦闘終了処理中…"/,
  "loss terminal checkpoint copy must be decision-aware");
assert.match(adapterSource, /button\[data-bag-use-item\]/);
assert.match(adapterSource, /button\[data-player-replacement-party-index\]/);
assert.match(adapterSource, /function setOwnerAwarePhaseInteractive/,
  "phase UI must preserve feature-owner disabled state for shared controls");
assert.match(adapterSource, /battleOwnerDisabled/,
  "phase UI must restore the Bag/replacement owner's disabled state after phase unlock");
assert.doesNotMatch(adapterSource, /setInteractive\(button, commandAllowed\)|setInteractive\(button, replacementAllowed\)/,
  "phase UI must not blindly re-enable Bag/replacement controls owned by another feature");
assert.doesNotMatch(adapterSource, /currentBattle\.completed|previewCommandBusy|player_replacement_required|new MutationObserver|let resolving|let returning/,
  "active UI adapter must not infer a second Battle phase truth");
assert.doesNotMatch(legacySource, /previewCommandBusy|player_replacement_required|battle\.completed|let resolving|let returning|new MutationObserver/,
  "legacy phase module must remain a thin adapter shim");
assert.match(replacementSource, /battle\?\.phase === REPLACEMENT_PHASE/);
assert.doesNotMatch(replacementSource, /previewCommandBusy|battle\.completed|player_replacement_required/,
  "replacement presentation must use orchestrator REPLACEMENT as its UI truth");
assert.match(bagSource, /battle\.phase === "COMMAND"/);
assert.doesNotMatch(bagSource, /battle\.completed|battle\.player_replacement_required|capture"\)\?\.disabled|setBattleControlsDisabled/,
  "Battle Bag must not derive availability from legacy completed/replacement/DOM busy state");
assert.match(flowPolishSource, /return current\.phase \?\? null/,
  "DPt flow polish must read the orchestrator phase directly");
assert.doesNotMatch(flowPolishSource, /current\.completed|previewCommandBusy|player_replacement_required/,
  "DPt flow polish must not infer a second Battle phase truth");
assert.match(menuFlowGuardSource, /return battle\(\)\?\.phase === "COMMAND"/,
  "DPt menu flow guard must use COMMAND as the sole Battle command truth");
assert.doesNotMatch(menuFlowGuardSource, /\.completed|player_replacement_required|previewCommandBusy/,
  "DPt menu flow guard must not infer command availability from legacy Battle flags");
assert.match(menuFlowGuardSource, /safari-battle-capture-requested/,
  "Battle Bag Ball must request the same direct capture owner as the DPt root Ball");
assert.doesNotMatch(menuFlowGuardSource, /capture\.click\(|getElementById\(["']capture["']\)/,
  "Battle Bag Ball must not relay capture through the legacy hidden capture control");
assert.match(captureOwnerSource, /safari-battle-capture-requested/,
  "capture presentation adapter must expose one shared direct request entrypoint");
assert.match(captureOwnerSource, /attemptSafariCapture\(currentRuntime\)/,
  "the shared capture request entrypoint must delegate mechanics to the existing capture owner");
assert.match(commandMenuSource, /return battle\.phase \?\? null/,
  "DPt command menu must read the orchestrator phase directly");
assert.match(commandMenuSource, /const commandAllowed = phase === "COMMAND"/,
  "DPt command availability must be owned by the orchestrator COMMAND phase");
assert.doesNotMatch(commandMenuSource, /\.completed|player_replacement_required|previewCommandBusy/,
  "DPt command menu must not infer phase or command availability from legacy Battle flags");
assert.match(previewBattleRenderSource, /const commandAllowed = battle\.phase === "COMMAND"/,
  "preview Battle move rendering must consume the orchestrator COMMAND phase directly");
assert.doesNotMatch(previewBattleRenderSource, /battle\.completed|\bbusy\b/,
  "preview Battle rendering must not recreate RESULT/COMMAND or Battle busy truth from legacy flags");
assert.match(previewBattleRenderSource, /__maplessApplyBattlePhaseUi\?\.\(\)/,
  "preview Battle rendering must delegate Battle control visibility/availability to the phase UI owner");
assert.doesNotMatch(indexSource, /battle-command-unlock-guard/,
  "shell must not load a second COMMAND unlock owner");

console.log("Safari Battle UI consumes only central orchestrator phases across result, replacement, Bag/capture/flee/switch and duplicate input: PASS");
