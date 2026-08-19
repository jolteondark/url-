import assert from "node:assert/strict";
import fs from "node:fs";
import {
  SAFARI_BATTLE_PHASE,
  beginSafariBattleCommand,
  commitSafariBattleResolution,
  completeSafariBattleReplacement,
  ensureSafariBattleOrchestrator,
} from "../runtime/safari-battle-orchestrator.js";

const byId = new Map();
const windowListeners = new Map();
let captureClick = null;

class FakeElement {
  constructor(id = null) {
    this.id = id;
    this.dataset = {};
    this.hidden = false;
    this.inert = false;
    this.disabled = false;
    this.textContent = "";
    this.attributes = new Map();
    this.children = [];
    if (id) byId.set(id, this);
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  querySelector(selector) {
    if (selector === "small") return this.small ?? null;
    return null;
  }
  querySelectorAll(selector) {
    if (this.id === "moves" && selector === "button[data-move-id]") return this.children;
    return [];
  }
}

const turn = new FakeElement("turn");
const message = new FakeElement("battle-message");
const moves = new FakeElement("moves");
const move = new FakeElement();
move.dataset.moveId = "TACKLE";
move.small = { textContent: "威力 40 / PP 35" };
moves.children = [move];
const capture = new FakeElement("capture");
const flee = new FakeElement("flee");
const returnBoard = new FakeElement("return-board");
const battleCard = new FakeElement("battle-card");
const bagButton = new FakeElement();
bagButton.dataset.bagUseItem = "POTION";

const documentStub = {
  getElementById(id) { return byId.get(id) ?? null; },
  querySelectorAll(selector) { return selector === "button[data-bag-use-item]" ? [bagButton] : []; },
  addEventListener(type, listener, options) {
    if (type === "click" && options === true) captureClick = listener;
  },
};

globalThis.document = documentStub;
globalThis.window = {
  addEventListener(type, listener) { windowListeners.set(type, listener); },
};
globalThis.requestAnimationFrame = (callback) => { callback(); return 1; };

globalThis.__maplessSafariRuntime = runtime();
await import(`../battle-phase-ui-adapter.js?orchestrator-ui=${Date.now()}`);

function runtime(battle = {}) {
  return {
    variables: {
      mapless: {
        notice: "",
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

function setRuntime(rt) {
  globalThis.__maplessSafariRuntime = rt;
  globalThis.__maplessApplyBattlePhaseUi();
  return rt.variables.mapless.battle;
}

function clickTarget(selector) {
  return {
    closest(query) { return query.split(",").some((part) => part.trim() === selector) ? this : null; },
  };
}

function clickEvent(selector) {
  return {
    target: clickTarget(selector),
    preventDefault() { this.prevented = true; },
    stopImmediatePropagation() { this.stopped = true; },
  };
}

function assertCommandsLocked() {
  assert.equal(moves.inert, true);
  assert.equal(move.disabled, true);
  assert.equal(capture.disabled, true);
  assert.equal(flee.disabled, true);
  assert.equal(bagButton.disabled, true);
}

function assertCommandReady() {
  assert.equal(moves.inert, false);
  assert.equal(move.disabled, false);
  assert.equal(capture.disabled, false);
  assert.equal(flee.disabled, false);
  assert.equal(bagButton.disabled, false);
  assert.equal(returnBoard.disabled, true);
}

{
  const rt = runtime();
  ensureSafariBattleOrchestrator(rt);
  setRuntime(rt);
  assert.equal(rt.variables.mapless.battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
  assertCommandReady();
  assert.equal(turn.textContent, "Turn 1");
  assert.equal(message.textContent, "技を選んでください。");
}

for (const phase of [
  "ACTION_1", "CHECK_1", "ACTION_2", "CHECK_2", "POST_FAINT",
  "REPLACEMENT", "POST_VICTORY", "REWARD_GROWTH", "RETURN",
]) {
  const rt = runtime({ phase });
  setRuntime(rt);
  assertCommandsLocked();
  assert.equal(returnBoard.disabled, true, `${phase} must keep Return locked`);
}

// Legacy completion may still exist on old snapshots, but UI must not derive RESULT from it.
{
  const rt = runtime({ phase: null, completed: true });
  setRuntime(rt);
  assertCommandsLocked();
  assert.equal(returnBoard.disabled, true, "completed without orchestrator RESULT must not unlock Return");
  assert.equal(battleCard.dataset.battlePhase, "UNSYNCED");
}

// Wild terminal: the central owner reaches RESULT; only Return is interactive.
{
  const rt = runtime();
  ensureSafariBattleOrchestrator(rt);
  beginSafariBattleCommand(rt, "move");
  commitSafariBattleResolution(rt, {
    decision: 1,
    operations: [
      { op: "use_move", actor: "player" },
      { op: "faint", target: "foe" },
      { op: "gain_exp", amount: 40 },
      { op: "level_up", level: 6 },
      { op: "learn_move", move: "QUICKATTACK" },
      { op: "level_evolution", from: "A", to: "B" },
      { op: "item_received", item: "POTION" },
      { op: "trainer_prize_money", applied: 300 },
    ],
  }, "move");
  setRuntime(rt);
  assert.equal(rt.variables.mapless.battle.phase, SAFARI_BATTLE_PHASE.RESULT);
  assertCommandsLocked();
  assert.equal(returnBoard.disabled, false);
  assert.equal(returnBoard.inert, false);
  assert.equal(returnBoard.hidden, false);
  assert.equal(turn.textContent, "Result");
  const returnEvent = clickEvent("#return-board");
  captureClick(returnEvent);
  assert.equal(returnEvent.prevented, undefined, "RESULT Return must reach the owner");
  const duplicateCommand = clickEvent("#capture");
  captureClick(duplicateCommand);
  assert.equal(duplicateCommand.prevented, true, "RESULT must reject command double taps");
}

// Trainer reserve: owner trace passes REPLACEMENT and returns to COMMAND without RESULT.
{
  const rt = runtime({ kind: "trainer" });
  ensureSafariBattleOrchestrator(rt);
  beginSafariBattleCommand(rt, "move");
  commitSafariBattleResolution(rt, {
    decision: 0,
    foeReplacementApplied: true,
    operations: [{ op: "use_move", actor: "player" }, { op: "faint", target: "foe" }],
  }, "move");
  const phases = rt.variables.mapless.battle.phase_trace.map((entry) => entry.phase);
  assert.deepEqual(phases.slice(-3), ["POST_FAINT", "REPLACEMENT", "COMMAND"]);
  assert.equal(phases.includes("RESULT"), false);
  setRuntime(rt);
  assertCommandReady();
}

// Player KO: REPLACEMENT owns the UI until the replacement owner explicitly completes it.
{
  const rt = runtime();
  ensureSafariBattleOrchestrator(rt);
  beginSafariBattleCommand(rt, "move");
  commitSafariBattleResolution(rt, {
    decision: 0,
    playerReplacementRequired: true,
    operations: [{ op: "use_move", actor: "foe" }, { op: "faint", target: "player" }],
  }, "move");
  rt.variables.mapless.battle.player_replacement_required = true;
  setRuntime(rt);
  assert.equal(rt.variables.mapless.battle.phase, SAFARI_BATTLE_PHASE.REPLACEMENT);
  assertCommandsLocked();
  rt.variables.mapless.battle.player_replacement_required = false;
  completeSafariBattleReplacement(rt, {});
  setRuntime(rt);
  assert.equal(rt.variables.mapless.battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
  assertCommandReady();
}

// Item/capture/flee/switch consume ACTION_1. One living-foe response is ACTION_2.
for (const kind of ["item", "capture", "flee", "switch"]) {
  const rt = runtime();
  ensureSafariBattleOrchestrator(rt);
  beginSafariBattleCommand(rt, kind);
  setRuntime(rt);
  assert.equal(rt.variables.mapless.battle.phase, SAFARI_BATTLE_PHASE.ACTION_1);
  assertCommandsLocked();
  const doubleTap = clickEvent("#capture");
  captureClick(doubleTap);
  assert.equal(doubleTap.prevented, true, `${kind} ACTION_1 must block duplicate command input`);
  commitSafariBattleResolution(rt, {
    decision: 0,
    operations: [{ op: "use_move", actor: "foe" }],
  }, kind);
  const phases = rt.variables.mapless.battle.phase_trace.map((entry) => entry.phase);
  assert.ok(phases.includes("ACTION_2"), `${kind} living-foe response must be ACTION_2`);
  assert.ok(phases.includes("CHECK_2"), `${kind} living-foe response must be CHECK_2`);
  setRuntime(rt);
  assert.equal(rt.variables.mapless.battle.phase, SAFARI_BATTLE_PHASE.COMMAND);
  assertCommandReady();
}

const adapterSource = fs.readFileSync(new URL("../battle-phase-ui-adapter.js", import.meta.url), "utf8");
const legacySource = fs.readFileSync(new URL("../battle-turn-phase-presentation.js", import.meta.url), "utf8");
const previewSource = fs.readFileSync(new URL("../preview.js", import.meta.url), "utf8");
const indexSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
assert.doesNotMatch(adapterSource, /currentBattle\.completed|previewCommandBusy|player_replacement_required|new MutationObserver|\bresolving\b|\breturning\b/,
  "phase adapter must not infer a second Battle phase truth");
assert.doesNotMatch(previewSource, /battle-turn-phase-presentation/,
  "preview must not load the legacy Battle phase owner");
assert.doesNotMatch(indexSource, /battle-command-unlock-guard/,
  "shell must not load a second COMMAND unlock owner");
assert.match(indexSource, /battle-phase-ui-adapter\.js\?v=20260819-1734/);
assert.match(indexSource, /preview\.js\?v=20260819-1734/);
assert.doesNotMatch(legacySource, /previewCommandBusy|player_replacement_required|battle\.completed|let resolving|let returning|new MutationObserver/,
  "legacy module must remain only a thin adapter shim");

console.log("Safari Battle UI follows only central orchestrator phase; commands are COMMAND-only and Return is RESULT-only: PASS");
