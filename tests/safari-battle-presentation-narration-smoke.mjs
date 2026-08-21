import assert from "node:assert/strict";
import fs from "node:fs";
import { formatSafariBattlePresentationEvent } from "../battle-presentation-narration.js";
import { shouldFreezeCanonicalBattleSprite } from "../battle-sprite-phase-gate.js";

const events = [
  { type: "move_started", actor: "player", target: "foe", moveId: "TACKLE" },
  { type: "damage_applied", actor: "player", target: "foe", hpBefore: 20, hpAfter: 13 },
  { type: "move_started", actor: "foe", target: "player", moveId: "SCRATCH" },
  { type: "miss", actor: "foe", target: "player" },
  { type: "faint", target: "foe" },
  { type: "trainer_next", trainer: "たんぱんこぞう", species: "RATTATA" },
  { type: "battle_result", decision: 1 },
];

const contextFor = (event) => ({
  actorName: event.actor === "player" ? "EEVEE" : "PIKACHU",
  targetName: event.target === "player" ? "EEVEE" : "PIKACHU",
  moveName: event.moveId === "TACKLE" ? "たいあたり" : event.moveId === "SCRATCH" ? "ひっかく" : undefined,
  notice: event.type === "battle_result" ? "PIKACHUに勝利しました。" : undefined,
});

assert.deepEqual(events.map((event) => formatSafariBattlePresentationEvent(event, contextFor(event))), [
  "EEVEEのたいあたり！",
  "PIKACHUのHP 20 → 13",
  "PIKACHUのひっかく！",
  "PIKACHUの攻撃は外れた！",
  "PIKACHUは倒れた！",
  "たんぱんこぞうはRATTATAを繰り出した！",
  "PIKACHUに勝利しました。",
]);

assert.equal(formatSafariBattlePresentationEvent({
  type: "damage_applied",
  actor: "player",
  target: "foe",
  targetSpecies: "PIDGEY",
  targetMaxHp: 19,
  hpBefore: 19,
  hpAfter: 0,
}, { targetName: "RATTATA" }), "PIDGEYのHP 19 → 0");
assert.equal(formatSafariBattlePresentationEvent({
  type: "faint",
  target: "foe",
  targetSpecies: "PIDGEY",
}, { targetName: "RATTATA" }), "PIDGEYは倒れた！");

assert.equal(formatSafariBattlePresentationEvent({ type: "turn_end", turn: 1 }, {}), null,
  "turn_end stays phase-owned and must not create a second narration queue");
assert.equal(formatSafariBattlePresentationEvent({
  type: "capture",
  result: "caught",
  target: "foe",
  targetSpecies: "PIKACHU",
}, { targetName: "post-state-name" }), "PIKACHUを捕まえた！");
assert.equal(formatSafariBattlePresentationEvent({
  type: "capture",
  result: "failed",
  target: "foe",
  targetSpecies: "PIKACHU",
  numShakes: 2,
}, { targetName: "post-state-name" }), "PIKACHUを捕まえられなかった！");
assert.equal(formatSafariBattlePresentationEvent({ type: "battle_result", decision: 1 }, {}), null,
  "battle result text must come from the existing notice owner instead of inventing a second result truth");

const card = { hidden: false, dataset: { turnPhase: "command" } };
assert.equal(shouldFreezeCanonicalBattleSprite(card), false);
card.dataset.turnPhase = "resolving";
assert.equal(shouldFreezeCanonicalBattleSprite(card), true,
  "RESOLVING must freeze an already rendered canonical battler sprite");
card.dataset.turnPhase = "replacement";
assert.equal(shouldFreezeCanonicalBattleSprite(card), false,
  "phase exit must allow the current runtime battler to become visible");
card.hidden = true;
card.dataset.turnPhase = "resolving";
assert.equal(shouldFreezeCanonicalBattleSprite(card), false,
  "hidden Battle scene must not retain a stale sprite freeze");

const preview = fs.readFileSync(new URL("../preview-app.js", import.meta.url), "utf8");
const phase = fs.readFileSync(new URL("../battle-turn-phase-presentation.js", import.meta.url), "utf8");
const round = fs.readFileSync(new URL("../runtime/safari-normal-battle-round.js", import.meta.url), "utf8");
const lifecycle = fs.readFileSync(new URL("../runtime/safari-normal-battle-lifecycle.js", import.meta.url), "utf8");
const spriteBridge = fs.readFileSync(new URL("../canonical-battle-sprite-bridge.js", import.meta.url), "utf8");
assert.match(preview, /formatSafariBattlePresentationEvent/,
  "preview-app must narrate the existing presentation queue instead of creating another event source");
assert.match(preview, /dataset\.presentationOwner = "event"/,
  "preview-app must mark concrete presentation text so the phase guard preserves it while RESOLVING");
assert.match(preview, /event\.targetMaxHp \?\? pokemon\?\.max_hp/,
  "damage animation must prefer the event-bound old combatant max HP over post-round live state");
assert.match(phase, /presentationOwner === "event"/,
  "turn phase guard must preserve concrete presentation-event narration while RESOLVING");
assert.match(phase, /safari-battle-presentation-event/,
  "turn phase must follow the already owner-ordered presentation event stream instead of recomputing action order");
assert.match(phase, /if \(previewCommandBusy\(\)\) return false;\s*if \(battle\.completed \|\| battle\.player_replacement_required\) return true;/,
  "KO/replacement/result state must not release RESOLVING before the presentation busy lock is released");
assert.match(round, /targetSpecies/,
  "normal-round presentation must bind pre-round combatant identity to events");
assert.match(round, /targetMaxHp/,
  "normal-round presentation must bind pre-round max HP for replacement-safe damage animation");
assert.match(round, /continue_status_request/,
  "normal-round presentation must project owner status-block operations instead of inferring status from UI state");
assert.match(round, /display_confusion_self_damage/,
  "normal-round presentation must preserve owner confusion self-hit ordering");
assert.match(lifecycle, /presentation:\s*\[captureEvent, \.\.\.\(response\.presentation \?\? \[\]\)\]/,
  "failed capture action must be narrated before the opponent response using the existing presentation order");
assert.match(spriteBridge, /if \(shouldFreezeCanonicalBattleSprite\(battle\)\) return;/,
  "canonical sprite bridge must not consume post-round runtime identity while RESOLVING");
assert.match(spriteBridge, /attributeFilter:\s*\["data-turn-phase", "hidden"\]/,
  "canonical sprite bridge must resync narrowly on phase/visibility changes");
assert.match(spriteBridge, /if \(!shouldFreezeCanonicalBattleSprite\(card\)\) schedule\(\);/,
  "canonical sprite bridge must resync current runtime owner after RESOLVING exits");
assert.doesNotMatch(spriteBridge, /setInterval|setTimeout\(/,
  "canonical sprite synchronization must not poll");
assert.doesNotMatch(preview, /new MutationObserver\(/,
  "preview-app narration must not infer Battle mechanics from DOM mutation");

console.log("Safari Battle presentation narration: event-bound identity + frozen sprite through RESOLVING: ok");
await import("./safari-battle-action-order-presentation-smoke.mjs");
await import("./safari-status-action-cancellation-presentation-smoke.mjs");
await import("./safari-day10-day12-boundary-vertical-smoke.mjs");
await import("./safari-postbattle-save-continue-smoke.mjs");
await import("./safari-battle-bag-menu-smoke.mjs");
await import("./safari-battle-bag-delivery-smoke.mjs");
await import("./safari-battle-exp-growth-parity-smoke.mjs");
await import("./safari-wild-exp-single-commit-smoke.mjs");
await import("./battle-ordinary-burn-damage-owner.mjs");
await import("./battle-ordinary-paralysis-speed-owner.mjs");
await import("./browser-status-move-no-damage-smoke.mjs");
await import("./battle-canonical-status-eligibility-smoke.mjs");
await import("./battle-ordinary-thunder-wave-status-owner.mjs");
await import("./battle-ordinary-powder-major-status-owner.mjs");
await import("./safari-consumed-action-foe-response-smoke.mjs");
await import("./browser-direct-normal-stat-stages-smoke.mjs");
await import("./safari-battle-automatic-owner-phase-smoke.mjs");
await import("./safari-battle-explicit-return-begin-smoke.mjs");
