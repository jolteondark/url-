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

const flushFrames = () => {
  let guard = 0;
  while (frames.length) {
    frames.shift()();
    guard += 1;
    if (guard > 20) throw new Error("turn phase frame loop did not settle");
  }
};

await import(`../battle-turn-phase-presentation.js?phase-smoke=${Date.now()}`);
flushFrames();
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
flushFrames();
assert.equal(battleCard.dataset.turnPhase, "command", "phase returns to COMMAND only after turn advances and preview busy clears");
assert.equal(phaseNode.textContent, "Turn 2 • コマンド選択");
assert.equal(moves.inert, false, "commands reopen for the next turn");

globalThis.__maplessSafariRuntime.variables.mapless.battle.player_replacement_required = true;
windowListeners.get("safari-runtime-changed")();
flushFrames();
assert.equal(battleCard.dataset.turnPhase, "replacement", "usable reserve KO must enter replacement choice phase");
assert.equal(phaseNode.textContent, "Turn 2 • 交代選択");
assert.equal(moves.inert, true, "normal commands stay inert while replacement is required");

globalThis.__maplessSafariRuntime.variables.mapless.battle.player_replacement_required = false;
globalThis.__maplessSafariRuntime.variables.mapless.battle.completed = true;
windowListeners.get("safari-runtime-changed")();
flushFrames();
assert.equal(battleCard.dataset.turnPhase, "result", "terminal Battle must enter result phase");
assert.equal(phaseNode.textContent, "結果");

const previewSource = fs.readFileSync(new URL("../preview.js", import.meta.url), "utf8");
const indexSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const deferredSource = fs.readFileSync(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");
assert.match(previewSource, /battle-turn-phase-presentation\.js\?v=20260818-1645/,
  "turn phase guard must be required-loaded by the playable preview, not left to an optional stale loader");
assert.match(indexSource, /preview\.js\?v=20260818-1645/,
  "public entrypoint must expose the turn-phase capable preview build");
assert.match(indexSource, /build 20260818-1645/,
  "visible build marker must match the turn-phase preview build");
assert.doesNotMatch(deferredSource, /battle-turn-phase-presentation/,
  "turn phase guard must not be loaded a second time through the deferred loader");

console.log("Safari Battle UI: COMMAND -> RESOLVING lock -> COMMAND -> REPLACEMENT -> RESULT: ok");
