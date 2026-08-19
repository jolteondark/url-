import assert from "node:assert/strict";
import fs from "node:fs";
import { SAFARI_BATTLE_PHASE } from "../runtime/safari-battle-orchestrator.js";

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
new FakeElement("save-run");
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
  dispatchEvent() {},
};
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.requestAnimationFrame = (callback) => {
  frames.push(callback);
  return frames.length;
};
globalThis.MutationObserver = class MutationObserver {
  constructor() {}
  observe() {}
};
globalThis.__maplessSafariRuntime = {
  variables: {
    mapless: {
      battle: {
        turn: 1,
        completed: false,
        phase: SAFARI_BATTLE_PHASE.COMMAND,
        phase_trace: [],
      },
    },
  },
};

const battle = () => globalThis.__maplessSafariRuntime.variables.mapless.battle;
const flushFrames = () => {
  let guard = 0;
  while (frames.length) {
    frames.shift()();
    guard += 1;
    if (guard > 20) throw new Error("phase adapter frame loop did not settle");
  }
};
const setPhase = (phase) => {
  battle().phase = phase;
  windowListeners.get("safari-runtime-changed")?.();
  flushFrames();
};
const clickFor = (target) => ({
  target,
  preventDefault() { this.prevented = true; },
  stopImmediatePropagation() { this.stopped = true; },
});

await import(`../battle-turn-phase-presentation.js?orchestrator-ui-smoke=${Date.now()}`);
flushFrames();
assert.equal(battleCard.dataset.turnPhase, SAFARI_BATTLE_PHASE.COMMAND);
assert.equal(phaseNode.textContent, "コマンド選択");
assert.equal(battleMessage.textContent, "技を選んでください。");
assert.equal(moves.inert, false);

const firstCommand = clickFor(moveButton);
battleCard.listeners.get("click")(firstCommand);
assert.equal(firstCommand.prevented, undefined, "COMMAND must allow exactly the owner-bound command path");

for (const phase of [
  SAFARI_BATTLE_PHASE.ACTION_1,
  SAFARI_BATTLE_PHASE.CHECK_1,
  SAFARI_BATTLE_PHASE.ACTION_2,
  SAFARI_BATTLE_PHASE.CHECK_2,
  SAFARI_BATTLE_PHASE.POST_FAINT,
  SAFARI_BATTLE_PHASE.POST_VICTORY,
  SAFARI_BATTLE_PHASE.REWARD_GROWTH,
]) {
  setPhase(phase);
  assert.equal(moves.inert, true, `${phase} must lock moves`);
  assert.equal(capture.disabled, true, `${phase} must lock capture`);
  assert.equal(flee.disabled, true, `${phase} must lock flee`);
  assert.equal(returnBoard.disabled, true, `${phase} must lock RETURN`);
  const duplicate = clickFor(moveButton);
  battleCard.listeners.get("click")(duplicate);
  assert.equal(duplicate.prevented, true, `${phase} must block double-submit commands`);
  assert.equal(duplicate.stopped, true);
}

setPhase(SAFARI_BATTLE_PHASE.POST_FAINT);
windowListeners.get("safari-battle-presentation-event")?.({ detail: { event: { type: "faint", target: "foe" } } });
flushFrames();
assert.notEqual(battleMessage.textContent, "技を選んでください。",
  "KO/post-faint must never restore the COMMAND prompt early");

setPhase(SAFARI_BATTLE_PHASE.REPLACEMENT);
assert.equal(phaseNode.textContent, "交代選択");
assert.equal(battleMessage.textContent, "次のポケモンを選んでください。");
assert.equal(moves.inert, true);
assert.equal(capture.disabled, true);
assert.equal(flee.disabled, true);

// Trainer reserve: orchestrator shows REPLACEMENT, then returns to COMMAND without RESULT.
setPhase(SAFARI_BATTLE_PHASE.COMMAND);
assert.equal(phaseNode.textContent, "コマンド選択");
assert.equal(battleMessage.textContent, "技を選んでください。");
assert.equal(moves.inert, false);
assert.equal(capture.disabled, false);

// Player replacement uses the same REPLACEMENT lock and only reopens commands after owner completion.
setPhase(SAFARI_BATTLE_PHASE.REPLACEMENT);
assert.equal(moves.inert, true);
setPhase(SAFARI_BATTLE_PHASE.COMMAND);
assert.equal(moves.inert, false);

setPhase(SAFARI_BATTLE_PHASE.RESULT);
battleMessage.textContent = "勝利！ / 20 EXP / Lv.6 / POTION ×1 / 120円 / ReturnでDay Boardへ";
windowListeners.get("safari-runtime-changed")?.();
flushFrames();
assert.equal(phaseNode.textContent, "結果");
assert.equal(moves.inert, true, "RESULT keeps ordinary commands locked");
assert.equal(capture.disabled, true);
assert.equal(flee.disabled, true);
assert.equal(returnBoard.disabled, false, "RESULT exposes RETURN only");
assert.match(battleMessage.textContent, /EXP/);
assert.match(battleMessage.textContent, /Lv\.6/);
assert.match(battleMessage.textContent, /POTION/);
assert.match(battleMessage.textContent, /120円/);
const blockedResultCommand = clickFor(moveButton);
battleCard.listeners.get("click")(blockedResultCommand);
assert.equal(blockedResultCommand.prevented, true);
const firstReturn = clickFor(returnBoard);
battleCard.listeners.get("click")(firstReturn);
assert.equal(firstReturn.prevented, undefined, "RESULT must allow RETURN");

setPhase(SAFARI_BATTLE_PHASE.RETURN);
assert.equal(returnBoard.disabled, true, "RETURN phase prevents double-tap return");
const duplicateReturn = clickFor(returnBoard);
battleCard.listeners.get("click")(duplicateReturn);
assert.equal(duplicateReturn.prevented, true);
assert.equal(duplicateReturn.stopped, true);

const source = fs.readFileSync(new URL("../battle-turn-phase-presentation.js", import.meta.url), "utf8");
assert.match(source, /SAFARI_BATTLE_PHASE/);
assert.match(source, /completeSafariBattlePresentation/);
assert.doesNotMatch(source, /let resolving\b/);
assert.doesNotMatch(source, /let returning\b/);
assert.doesNotMatch(source, /submittedTurn/);
assert.doesNotMatch(source, /previewCommandBusy/);
assert.doesNotMatch(source, /battle\?\.completed|battle\.completed/,
  "UI phase adapter must not derive phase from legacy completed");
assert.doesNotMatch(source, /player_replacement_required/,
  "UI phase adapter must not derive phase from replacement flags");

console.log("Safari Battle UI: orchestrator phase is the sole command/result/replacement lock owner: ok");
