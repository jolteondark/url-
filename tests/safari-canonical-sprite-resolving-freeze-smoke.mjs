import assert from "node:assert/strict";
import fs from "node:fs";
import { shouldFreezeCanonicalBattleSprite } from "../battle-sprite-phase-gate.js";

const card = { hidden: false, dataset: { turnPhase: "command" } };
assert.equal(shouldFreezeCanonicalBattleSprite(card), false, "COMMAND must allow runtime-owned sprite sync");
card.dataset.turnPhase = "resolving";
assert.equal(shouldFreezeCanonicalBattleSprite(card), true, "RESOLVING must freeze the currently rendered canonical sprite");
card.dataset.turnPhase = "replacement";
assert.equal(shouldFreezeCanonicalBattleSprite(card), false, "REPLACEMENT must allow the selected active Pokemon to resync");
card.dataset.turnPhase = "result";
assert.equal(shouldFreezeCanonicalBattleSprite(card), false, "RESULT may resync the terminal runtime owner");
card.hidden = true;
card.dataset.turnPhase = "resolving";
assert.equal(shouldFreezeCanonicalBattleSprite(card), false, "hidden Battle card must not hold a stale presentation freeze");

const bridge = fs.readFileSync(new URL("../canonical-battle-sprite-bridge.js", import.meta.url), "utf8");
assert.match(bridge, /if \(shouldFreezeCanonicalBattleSprite\(battle\)\) return;/,
  "sprite render must return before resolving any live runtime asset while a turn is presenting");
assert.match(bridge, /new MutationObserver\(\(\) => \{[\s\S]*if \(!shouldFreezeCanonicalBattleSprite\(card\)\) schedule\(\);/,
  "phase exit must schedule exactly the current runtime-owned sprite");
assert.match(bridge, /attributeFilter:\s*\["data-turn-phase", "hidden"\]/,
  "resync observer must be narrowly scoped to the shared phase/card visibility contract");
assert.doesNotMatch(bridge, /setInterval|setTimeout\(/,
  "sprite phase sync must not poll or create a second timing owner");

console.log("Safari canonical Battle sprite: freeze during RESOLVING -> resync on phase exit: ok");
