import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const presentation = await readFile(new URL("../normal-event-touch-presentation.js", import.meta.url), "utf8");

assert.doesNotMatch(presentation, /globalThis\.prompt/);
assert.match(presentation, /kind:"old_statue_offer_item"/);
assert.match(presentation, /kind:"old_statue_bonus_pokemon"/);
assert.match(presentation, /kind:"wishing_fountain_bonus_pokemon"/);
assert.match(presentation, /safariOldStatueOfferEntries/);
assert.match(presentation, /safariOldStatueBonusCandidates/);
assert.match(presentation, /safariOldStatuePrayNeedsPokemon/);
assert.match(presentation, /safariOldStatueOfferNeedsPokemon/);
assert.match(presentation, /safariWishingFountainBonusCandidates/);
assert.match(presentation, /if \(actionId === "back"\) return clearSelection/);
assert.match(presentation, /persistSafariOwnerResult/);

console.log("old statue / wishing fountain touch selection smoke: ok");
