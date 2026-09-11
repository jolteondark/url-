import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const presentation = await readFile(new URL("../normal-event-touch-presentation.js", import.meta.url), "utf8");

assert.match(index, /\.\/normal-event-touch-presentation\.js\?v=20260912-0400/);
assert.doesNotMatch(index, /\.\/normal-event-touch-presentation\.js\?v=20260912-0200/);
assert.doesNotMatch(presentation, /globalThis\.prompt|promptFn|prompt\(/);
assert.match(presentation, /active\.selection\?\.kind === "old_statue_offer_item"/);
assert.match(presentation, /active\.selection\?\.kind === "old_statue_bonus_pokemon"/);
assert.match(presentation, /active\.selection\?\.kind === "wishing_fountain_bonus_pokemon"/);
assert.match(presentation, /safariOldStatueOfferEntries\(current, active\.boardIndex\)/);
assert.match(presentation, /safariOldStatueBonusCandidates\(current\)/);
assert.match(presentation, /safariWishingFountainBonusCandidates\(current\)/);
assert.match(presentation, /actionId === "back"/);
assert.match(presentation, /persistSafariOwnerResult/);

console.log("statue/fountain touch public delivery smoke: ok");
