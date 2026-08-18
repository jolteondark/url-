import assert from "node:assert/strict";
import fs from "node:fs";
import { formatSafariBattlePresentationEvent } from "../battle-presentation-narration.js";

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

assert.equal(formatSafariBattlePresentationEvent({ type: "turn_end", turn: 1 }, {}), null,
  "turn_end stays phase-owned and must not create a second narration queue");
assert.equal(formatSafariBattlePresentationEvent({ type: "capture", result: "caught", target: "foe" }, { targetName: "PIKACHU" }), "PIKACHUを捕まえた！");
assert.equal(formatSafariBattlePresentationEvent({ type: "battle_result", decision: 1 }, {}), null,
  "battle result text must come from the existing notice owner instead of inventing a second result truth");

const preview = fs.readFileSync(new URL("../preview-app.js", import.meta.url), "utf8");
const phase = fs.readFileSync(new URL("../battle-turn-phase-presentation.js", import.meta.url), "utf8");
assert.match(preview, /formatSafariBattlePresentationEvent/,
  "preview-app must narrate the existing presentation queue instead of creating another event source");
assert.match(preview, /dataset\.presentationOwner = "event"/,
  "preview-app must mark concrete presentation text so the phase guard preserves it while RESOLVING");
assert.match(phase, /presentationOwner === "event"/,
  "turn phase guard must preserve concrete presentation-event narration while RESOLVING");
assert.doesNotMatch(preview, /new MutationObserver\(/,
  "preview-app narration must not infer Battle mechanics from DOM mutation");

console.log("Safari Battle presentation narration: existing event order -> visible battle message: ok");
