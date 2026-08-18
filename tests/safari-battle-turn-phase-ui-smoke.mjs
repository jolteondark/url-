import assert from "node:assert/strict";

const byId = new Map();
const frames = [];
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
    if (id) byId.set(id, this);
  }
  append(child) {
    this.children.push(child);
    if (child.id) byId.set(child.id, child);
    if (child.id === "battle-phase") phaseNode = child;
  }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  querySelector(selector) {
    if (selector === ".battle-topline") return byId.get("battle-topline");
    if (selector === ".battle-command-panel") return byId.get("battle-command-panel");
    return null;
  }
}

const battleCard = new FakeElement("battle-card");
new FakeElement("battle-topline");
new FakeElement("battle-command-panel");
const moves = new FakeElement("moves");
const capture = new FakeElement("capture");
new FakeElement("flee");
const moveButton = new FakeElement("move-button");
moveButton.dataset.moveId = "TACKLE";
moveButton.closest = (selector) => selector.includes("#moves button[data-move-id]") ? moveButton : null;

const documentStub = {
  getElementById(id) { return byId.get(id) ?? null; },
  createElement() { return new FakeElement(); },
};

globalThis.document = documentStub;
globalThis.window = {
  addEventListener() {},
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

await import(`../battle-turn-phase-presentation.js?phase-smoke=${Date.now()}`);
while (frames.length) frames.shift()();
assert.equal(phaseNode?.textContent, "Turn 1 • コマンド選択");
assert.equal(battleCard.dataset.turnPhase, "command");

const first = { target: moveButton, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; } };
battleCard.listeners.get("click")(first);
assert.equal(first.prevented, undefined, "first command must be allowed through to preview-app");
assert.equal(battleCard.dataset.turnPhase, "resolving");
assert.equal(phaseNode.textContent, "Turn 1 • 行動処理中");
await Promise.resolve();
assert.equal(moves.inert, true, "moves must become inert before another user input can dispatch");

const second = { target: moveButton, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; } };
battleCard.listeners.get("click")(second);
assert.equal(second.prevented, true, "duplicate command during RESOLVING must be prevented");
assert.equal(second.stopped, true, "duplicate command must not reach preview-app");

capture.disabled = false;
globalThis.__maplessSafariRuntime.variables.mapless.battle.turn = 2;
while (frames.length) frames.shift()();
assert.equal(battleCard.dataset.turnPhase, "command", "phase returns to COMMAND only after turn advances and preview busy clears");
assert.equal(phaseNode.textContent, "Turn 2 • コマンド選択");
assert.equal(moves.inert, false, "commands reopen for the next turn");

console.log("Safari Battle UI: COMMAND -> RESOLVING lock -> COMMAND next turn: ok");
