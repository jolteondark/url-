import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const presentation = await readFile(new URL("../normal-event-touch-presentation.js", import.meta.url), "utf8");

assert.doesNotMatch(presentation, /globalThis\.prompt|promptFn|prompt\(/);
assert.match(presentation, /old_statue_offer_item/);
assert.match(presentation, /old_statue_bonus_pokemon/);
assert.match(presentation, /wishing_fountain_bonus_pokemon/);
assert.match(presentation, /safariOldStatueOfferEntries\(current, active\.boardIndex\)/);
assert.match(presentation, /safariOldStatueBonusCandidates\(current\)/);
assert.match(presentation, /safariWishingFountainBonusCandidates\(current\)/);
assert.match(presentation, /id:`item:\$\{entry\.id\}`/);
assert.match(presentation, /id:`pokemon:\$\{entry\.index\}`/);
assert.match(presentation, /if \(actionId === "back"\)/);
assert.match(presentation, /persistenceRequested:false/);

console.log("normal-event touch selector smoke passed");
