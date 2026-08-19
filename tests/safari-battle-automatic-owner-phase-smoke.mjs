import assert from "node:assert/strict";

const byId = new Map();
const frames = [];
const listeners = new Map();
let phaseNode = null;

class FakeElement {
  constructor(id = null) {
    this.id = id;
    this.dataset = {};
    this.hidden = false;
    this.inert = false;
    this.disabled = false;
    this.textContent = "";
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
  setAttribute() {}
  querySelector(selector) {
    if (selector === ".battle-topline") return byId.get("battle-topline");
    if (selector === ".battle-command-panel") return byId.get("battle-command-panel");
    return null;
  }
}

const battleCard = new FakeElement("battle-card");
new FakeElement("battle-topline");
new FakeElement("battle-command-panel");
new FakeElement("battle-message");
const moves = new FakeElement("moves");
const capture = new FakeElement("capture");
const flee = new FakeElement("flee");
new FakeElement("return-board");
const moveButton = new FakeElement("move-button");
moveButton.dataset.moveId = "TACKLE";
moveButton.closest = (selector) => selector.includes("#moves button[data-move-id]") ? moveButton : null;

globalThis.document = {
  getElementById(id) { return byId.get(id) ?? null; },
  createElement() { return new FakeElement(); },
};
globalThis.window = { addEventListener(type, listener) { listeners.set(type, listener); } };
globalThis.requestAnimationFrame = (callback) => { frames.push(callback); return frames.length; };
globalThis.cancelAnimationFrame = () => {};
globalThis.MutationObserver = class MutationObserver { observe() {} };
globalThis.__maplessSafariRuntime = {
  variables: { mapless: { battle: { turn: 1, completed: false, player_replacement_required: false } } },
};

const runFrame = () => {
  const callback = frames.shift();
  assert.ok(callback, "expected a scheduled frame");
  callback();
};
const flushFrames = () => {
  let guard = 0;
  while (frames.length) {
    frames.shift()();
    if (++guard > 20) throw new Error("phase loop did not settle");
  }
};

await import(`../battle-turn-phase-presentation.js?automatic-owner=${Date.now()}`);
flushFrames();

const click = {
  target: moveButton,
  preventDefault() { this.prevented = true; },
  stopImmediatePropagation() { this.stopped = true; },
};
battleCard.listeners.get("click")(click);
await Promise.resolve();
assert.equal(click.prevented, undefined, "first command reaches the mechanics owner");
assert.equal(moves.inert, true);
assert.equal(capture.disabled, true);
assert.equal(flee.disabled, true);

listeners.get("safari-battle-presentation-event")({ detail: { event: { type: "turn_end", turn: 1 } } });
assert.equal(battleCard.dataset.turnPhase, "resolving");
assert.equal(battleCard.dataset.turnAction, "automatic");
assert.equal(phaseNode.textContent, "自動効果処理中",
  "owner-ordered automatic end-of-round work must not expose COMMAND while its presentation is active");
assert.equal(moves.inert, true);

// The mechanics owner can already have committed a terminal result while a
// recoil/item/ability tail is still being presented. Busy wins until preview
// releases its existing command lock; then RESULT is exposed exactly once.
globalThis.__maplessSafariRuntime.variables.mapless.battle.turn = 2;
globalThis.__maplessSafariRuntime.variables.mapless.battle.completed = true;
listeners.get("safari-runtime-changed")();
runFrame();
assert.equal(battleCard.dataset.turnPhase, "resolving");
assert.equal(phaseNode.textContent, "自動効果処理中");

capture.disabled = false;
flee.disabled = false;
runFrame();
assert.equal(battleCard.dataset.turnPhase, "result");
assert.equal(phaseNode.textContent, "結果");
assert.equal(moves.inert, true, "terminal owner state keeps commands inert after automatic presentation settles");
flushFrames();

console.log("Safari Battle UI automatic owner tail remains RESOLVING until presentation settles: ok");
await import("./safari-post-ko-lifecycle-vertical-smoke.mjs");
