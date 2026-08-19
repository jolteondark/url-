import assert from "node:assert/strict";
import fs from "node:fs";

const byId = new Map();
const frames = [];
const windowListeners = new Map();
let phaseNode = null;

class FakeElement {
  constructor(id = null) {
    this.id = id;
    this.dataset = {};
    this.hidden = false;
    this.inert = false;
    this.disabled = false;
    this.textContent = "";
    this.className = "";
    this.listeners = new Map();
    this.children = [];
    this.attributes = new Map();
    if (id) byId.set(id, this);
  }
  append(child) {
    this.children.push(child);
    if (child.id) byId.set(child.id, child);
    if (child.id === "battle-phase") phaseNode = child;
  }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  querySelector(selector) {
    if (selector === ".battle-topline") return byId.get("battle-topline");
    if (selector === ".battle-command-panel") return byId.get("battle-command-panel");
    return null;
  }
}

const battleCard = new FakeElement("battle-card");
new FakeElement("battle-topline");
new FakeElement("battle-command-panel");
const battleMessage = new FakeElement("battle-message");
const moves = new FakeElement("moves");
const capture = new FakeElement("capture");
const flee = new FakeElement("flee");
const returnBoard = new FakeElement("return-board");
const moveButton = new FakeElement("move-button");
moveButton.dataset.moveId = "TACKLE";
moveButton.closest = (selector) => selector.includes("#moves button[data-move-id]") ? moveButton : null;
capture.closest = (selector) => selector.includes("#capture") ? capture : null;
flee.closest = (selector) => selector.includes("#flee") ? flee : null;
returnBoard.closest = (selector) => selector === "#return-board" ? returnBoard : null;

globalThis.document = {
  getElementById(id) { return byId.get(id) ?? null; },
  createElement() { return new FakeElement(); },
};
globalThis.window = {
  addEventListener(type, listener) { windowListeners.set(type, listener); },
};
globalThis.requestAnimationFrame = (callback) => {
  frames.push(callback);
  return frames.length;
};
globalThis.cancelAnimationFrame = () => {};
globalThis.MutationObserver = class MutationObserver { observe() {} };

globalThis.__maplessSafariRuntime = {
  variables: {
    mapless: {
      battle: {
        turn: 1,
        phase: "COMMAND",
        phase_trace: [{ phase: "COMMAND", turn: 1 }],
        completed: false,
        player_replacement_required: false,
      },
    },
  },
};

const battle = () => globalThis.__maplessSafariRuntime.variables.mapless.battle;
const flushFrames = () => {
  let guard = 0;
  while (frames.length) {
    frames.shift()();
    if (++guard > 20) throw new Error("phase render loop did not settle");
  }
};
const sync = () => {
  windowListeners.get("safari-runtime-changed")?.();
  flushFrames();
};
const click = (target) => ({
  target,
  preventDefault() { this.prevented = true; },
  stopImmediatePropagation() { this.stopped = true; },
});

await import(`../battle-turn-phase-presentation.js?orchestrator-ui=${Date.now()}`);
flushFrames();
assert.equal(battleCard.dataset.turnPhase, "command");
assert.equal(phaseNode.textContent, "コマンド選択");
assert.equal(battleMessage.textContent, "技を選んでください。");
assert.equal(moves.inert, false);

// COMMAND is the only normal command phase. ACTION/CHECK/POST_* must lock all
// move/capture/flee inputs without re-deciding mechanics.
for (const phase of ["ACTION_1", "CHECK_1", "ACTION_2", "CHECK_2", "POST_FAINT", "POST_VICTORY", "REWARD_GROWTH"]) {
  battle().phase = phase;
  battle().phase_trace.push({ phase, turn: 1 });
  sync();
  assert.equal(moves.inert, true, `${phase} must lock moves`);
  assert.equal(capture.inert, true, `${phase} must lock capture`);
  assert.equal(flee.inert, true, `${phase} must lock flee`);
  const duplicate = click(moveButton);
  battleCard.listeners.get("click")(duplicate);
  assert.equal(duplicate.prevented, true, `${phase} duplicate command must be prevented`);
  assert.equal(duplicate.stopped, true);
}

// Owner operations may be presented while the owner is in a non-COMMAND phase;
// the UI only changes the action label, never priority/speed/KO ownership.
battle().phase = "ACTION_1";
windowListeners.get("safari-battle-presentation-event")({ detail: { event: { type: "move_started", actor: "foe" } } });
assert.equal(battleCard.dataset.turnAction, "foe");
assert.equal(phaseNode.textContent, "相手action処理中");

// Thin compatibility: preview-app's async mutex can outlive the owner transition.
// While it drains, show the preceding orchestrator trace phase instead of inventing
// a local RESOLVING phase. This prevents the KO/send-out gap from flashing COMMAND.
battle().phase = "COMMAND";
battle().phase_trace.push({ phase: "POST_FAINT", turn: 1 }, { phase: "REPLACEMENT", turn: 1 }, { phase: "COMMAND", turn: 1 });
capture.disabled = true;
sync();
assert.equal(battleCard.dataset.turnPhase, "replacement");
assert.notEqual(battleMessage.textContent, "技を選んでください.");
assert.equal(moves.inert, true, "trainer reserve presentation stays locked before COMMAND is exposed");
capture.disabled = false;
sync();
assert.equal(battleCard.dataset.turnPhase, "command");
assert.equal(moves.inert, false, "trainer reserve returns to COMMAND only after presentation mutex drains");

// Player replacement is an owner phase, not completed/player_replacement UI logic.
battle().phase = "REPLACEMENT";
battle().player_replacement_required = true;
sync();
assert.equal(battleCard.dataset.turnPhase, "replacement");
assert.equal(phaseNode.textContent, "交代選択");
assert.equal(battleMessage.textContent, "次のポケモンを選んでください。");
assert.equal(moves.inert, true);

// RESULT: all normal commands stay locked and RETURN alone is accepted.
battle().phase = "RESULT";
battle().completed = true;
battle().player_replacement_required = false;
battle().phase_trace.push({ phase: "REWARD_GROWTH", turn: 1 }, { phase: "RESULT", turn: 1 });
returnBoard.disabled = false;
sync();
assert.equal(battleCard.dataset.turnPhase, "result");
assert.equal(moves.inert, true);
assert.equal(capture.inert, true);
assert.equal(flee.inert, true);
assert.equal(returnBoard.inert, false);
for (const target of [moveButton, capture, flee]) {
  const blocked = click(target);
  battleCard.listeners.get("click")(blocked);
  assert.equal(blocked.prevented, true, "RESULT must reject every non-return command");
}
const firstReturn = click(returnBoard);
battleCard.listeners.get("click")(firstReturn);
assert.equal(firstReturn.prevented, undefined, "RESULT allows exactly the Return path to owner");

// Once the owner advances to RETURN, a second tap is rejected synchronously.
battle().phase = "RETURN";
sync();
const duplicateReturn = click(returnBoard);
battleCard.listeners.get("click")(duplicateReturn);
assert.equal(duplicateReturn.prevented, true);
assert.equal(duplicateReturn.stopped, true);
assert.equal(returnBoard.inert, true);

// Terminal presentation tail must not flash RESULT early while preview is still busy.
battle().phase = "RESULT";
returnBoard.disabled = true;
sync();
assert.equal(battleCard.dataset.turnPhase, "reward_growth");
assert.notEqual(battleMessage.textContent, "技を選んでください。", "KO tail must never regress to command prompt");
returnBoard.disabled = false;
sync();
assert.equal(battleCard.dataset.turnPhase, "result");

const source = fs.readFileSync(new URL("../battle-turn-phase-presentation.js", import.meta.url), "utf8");
assert.doesNotMatch(source, /let resolving|let returning|submittedTurn|resolutionSettled/,
  "legacy local RESOLVING/return phase state must stay removed");
assert.match(source, /battle\.phase/);
assert.match(source, /phase_trace/);

console.log("Safari Battle UI: orchestrator phase is the command/replace/result/return truth; compatibility busy only delays exposing final owner phase: ok");
