import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const presentation = await readFile(new URL("../normal-event-touch-presentation.js", import.meta.url), "utf8");
const owner = await readFile(new URL("../runtime/safari-wishing-fountain-touch-owner.js", import.meta.url), "utf8");

assert.match(index, /\.\/normal-event-touch-presentation\.js\?v=20260912-1900/);
assert.doesNotMatch(index, /\.\/normal-event-touch-presentation\.js\?v=20260912-1300/);
assert.match(index, /"\.\/runtime\/safari-wishing-fountain-touch-owner\.js": "\.\/runtime\/safari-wishing-fountain-touch-owner\.js\?v=20260912-1900"/);
assert.match(presentation, /wishing_fountain:"\.\/runtime\/safari-wishing-fountain-touch-owner\.js"/);
assert.match(presentation, /owner\.safariWishingFountainLargeWishNeedsPokemon\(current, active\.boardIndex\)/);
assert.doesNotMatch(presentation, /normal_data\?\.large_roll/);
assert.doesNotMatch(presentation, /roll >= 45 && roll < 65/);
assert.match(owner, /resolveWishingFountain\(/);
assert.match(owner, /operation\?\.op === "choose_pokemon"/);
assert.match(owner, /if \(money < price\) return false/);

console.log("wishing fountain touch owner public delivery smoke: ok");
