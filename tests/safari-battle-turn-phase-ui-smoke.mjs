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
battleMessage.textContent = "技を選んでください。";
const moves = new FakeElement("moves");
const capture = new FakeElement("capture");
new FakeElement("flee");
const returnBoard = new FakeElement("return-board");
returnBoard.hidden = true;
const moveButton = new FakeElement("move-button");
moveButton.dataset.moveId = "TACKLE";
moveButton.closest = (selector) => selector.includes("#moves button[data-move-id]") ? moveButton : null;
returnBoard.closest = (selector) => selector === "#return-board" ? returnBoard : null;

const documentStub = {
  getElementById(id) { return byId.get(id) ?? null; },
  createElement() { return new FakeElement(); },
};

globalThis.document = documentStub;
globalThis.window = {
  addEventListener(type, listener) { windowListeners.set(type, listener); },
};
globalThis.requestAnimationFrame = (callback) => {
  frames.push(callback);
  return frames.length;
};
globalThis.cancelAnimationFrame = () => {};
globalThis.MutationObserver = class MutationObserver {
  constructor() {}
  observe() {}
};
globalThis.__maplessSafariRuntime = {
  variables: { mapless: { battle: { turn: 1, completed: false, player_replacement_required: false } } },
};

const runOneFrame = () => {
  const callback = frames.shift();
  assert.ok(callback, "expected a scheduled animation frame");
  callback();
};
const flushFrames = () => {
  let guard = 0;
  while (frames.length) {
    frames.shift()();
    guard += 1;
    if (guard > 20) throw new Error("turn phase frame loop did not settle");
  }
};
const commandClick = () => ({
  target: moveButton,
  preventDefault() { this.prevented = true; },
  stopImmediatePropagation() { this.stopped = true; },
});
const returnClick = () => ({
  target: returnBoard,
  preventDefault() { this.prevented = true; },
  stopImmediatePropagation() { this.stopped = true; },
});
const battle = () => globalThis.__maplessSafariRuntime.variables.mapless.battle;

await import(`../battle-turn-phase-presentation.js?phase-smoke=${Date.now()}`);
flushFrames();
assert.equal(phaseNode?.textContent, "コマンド選択", "numeric Turn stays owned by preview #turn");
assert.equal(battleMessage.textContent, "技を選んでください。");
assert.equal(battleCard.dataset.turnPhase, "command");

capture.disabled = true;
windowListeners.get("safari-runtime-changed")();
runOneFrame();
assert.equal(battleCard.dataset.turnPhase, "resolving",
  "Bag-owned busy state outside battle-card must enter the shared RESOLVING phase");
assert.equal(phaseNode.textContent, "行動処理中");
assert.equal(moves.inert, true, "Bag turn must keep Battle commands inert through the shared phase owner");
capture.disabled = false;
windowListeners.get("safari-runtime-changed")();
runOneFrame();
assert.equal(battleCard.dataset.turnPhase, "command");
assert.equal(moves.inert, false);
flushFrames();

const first = commandClick();
battleCard.listeners.get("click")(first);
assert.equal(first.prevented, undefined, "first command must be allowed through to preview-app");
assert.equal(battleCard.dataset.turnPhase, "resolving");
assert.equal(phaseNode.textContent, "行動処理中");
assert.equal(battleMessage.textContent, "ターンを処理しています…");
await Promise.resolve();
assert.equal(moves.inert, true, "moves must become inert before another user input can dispatch");

battleMessage.dataset.presentationOwner = "event";
battleMessage.textContent = "EEVEEのたいあたり！";
runOneFrame();
assert.equal(battleCard.dataset.turnPhase, "resolving");
assert.equal(battleMessage.textContent, "EEVEEのたいあたり！",
  "phase sync must preserve concrete presentation-event narration while RESOLVING");
assert.equal(battleMessage.dataset.presentationOwner, "event");

const duplicate = commandClick();
battleCard.listeners.get("click")(duplicate);
assert.equal(duplicate.prevented, true, "duplicate command during RESOLVING must be prevented");
assert.equal(duplicate.stopped, true, "duplicate command must not reach preview-app");

capture.disabled = false;
battle().turn = 2;
flushFrames();
assert.equal(battleCard.dataset.turnPhase, "command");
assert.equal(phaseNode.textContent, "コマンド選択");
assert.equal(battleMessage.textContent, "技を選んでください。", "COMMAND restores the normal prompt");
assert.equal(battleMessage.dataset.presentationOwner, undefined, "COMMAND releases event narration ownership");
assert.equal(moves.inert, false);

const terminalCommand = commandClick();
battleCard.listeners.get("click")(terminalCommand);
await Promise.resolve();
capture.disabled = true;
battle().turn = 3;
battle().completed = true;
windowListeners.get("safari-runtime-changed")();
runOneFrame();
assert.equal(battleCard.dataset.turnPhase, "resolving");
assert.equal(phaseNode.textContent, "行動処理中");
assert.equal(battleMessage.textContent, "ターンを処理しています…");
capture.disabled = false;
battleMessage.dataset.presentationOwner = "event";
battleMessage.textContent = "バトルに勝利した！";
returnBoard.hidden = false;
returnBoard.disabled = false;
runOneFrame();
assert.equal(battleCard.dataset.turnPhase, "result");
assert.equal(phaseNode.textContent, "結果");
assert.equal(battleMessage.textContent, "バトルに勝利した！", "RESULT must preserve preview-owned terminal notice");
flushFrames();

const firstReturn = returnClick();
battleCard.listeners.get("click")(firstReturn);
assert.equal(firstReturn.prevented, undefined, "first result return must reach preview-app");
await Promise.resolve();
assert.equal(returnBoard.disabled, true, "result return must lock before a second physical tap can dispatch");
assert.equal(returnBoard.inert, true);
const duplicateReturn = returnClick();
battleCard.listeners.get("click")(duplicateReturn);
assert.equal(duplicateReturn.prevented, true, "duplicate result return must be prevented");
assert.equal(duplicateReturn.stopped, true, "duplicate result return must not reach preview-app");
returnBoard.disabled = false;
windowListeners.get("safari-runtime-changed")();
runOneFrame();
assert.equal(returnBoard.inert, false, "a failed return render may unlock the same completed result for retry");
flushFrames();

battle().completed = false;
battle().player_replacement_required = false;
battle().turn = 3;
returnBoard.hidden = true;
windowListeners.get("safari-runtime-changed")();
flushFrames();
assert.equal(battleMessage.textContent, "技を選んでください。");
assert.equal(battleMessage.dataset.presentationOwner, undefined);
const replacementCommand = commandClick();
battleCard.listeners.get("click")(replacementCommand);
await Promise.resolve();
capture.disabled = true;
battle().turn = 4;
battle().player_replacement_required = true;
windowListeners.get("safari-runtime-changed")();
runOneFrame();
assert.equal(phaseNode.textContent, "行動処理中");
assert.equal(battleMessage.textContent, "ターンを処理しています…");
capture.disabled = false;
runOneFrame();
assert.equal(battleCard.dataset.turnPhase, "replacement");
assert.equal(phaseNode.textContent, "交代選択");
assert.equal(battleMessage.textContent, "次のポケモンを選んでください。");
assert.equal(battleMessage.dataset.presentationOwner, undefined);
assert.equal(moves.inert, true);
flushFrames();

battle().player_replacement_required = false;
battle().turn = 4;
windowListeners.get("safari-runtime-changed")();
flushFrames();
const fleeLikeCommand = commandClick();
battleCard.listeners.get("click")(fleeLikeCommand);
await Promise.resolve();
capture.disabled = true;
globalThis.__maplessSafariRuntime.variables.mapless.battle = null;
battleCard.hidden = false;
windowListeners.get("safari-runtime-changed")();
runOneFrame();
assert.equal(battleCard.dataset.turnPhase, "resolving");
assert.equal(phaseNode.textContent, "行動処理中");
assert.equal(battleMessage.textContent, "ターンを処理しています…");
battleCard.hidden = true;
runOneFrame();
assert.equal(phaseNode.hidden, true);
assert.equal(frames.length, 0);

const previewSource = fs.readFileSync(new URL("../preview.js", import.meta.url), "utf8");
const indexSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const deferredSource = fs.readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");
assert.match(previewSource, /preview-app\.js\?v=20260818-2318/,
  "public preview must require-load the current preview-app build");
assert.match(previewSource, /battle-turn-phase-presentation\.js\?v=20260819-0416/);
assert.match(indexSource, /preview\.js\?v=20260819-0416/);
assert.match(indexSource, /build 20260819-0416/);
assert.doesNotMatch(deferredSource, /battle-turn-phase-presentation/);

console.log("Safari Battle UI: move/Bag commands and result return share one-input busy lifecycle: ok");