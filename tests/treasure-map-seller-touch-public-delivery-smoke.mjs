import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const command = await readFile(new URL("../runtime/safari-pokemon-center-command.js", import.meta.url), "utf8");
const touch = await readFile(new URL("../runtime/safari-treasure-map-seller-touch.js", import.meta.url), "utf8");

assert.match(index, /\.\/runtime\/safari-pokemon-center-command\.js\?v=20260912-1400/);
assert.doesNotMatch(index, /\.\/runtime\/safari-pokemon-center-command\.js\?v=20260912-1208/);
assert.match(index, /\.\/runtime\/safari-treasure-map-seller-touch\.js\?v=20260912-1400/);
assert.match(command, /openSafariTreasureMapSellerTouch/);
assert.match(command, /normal_event_id === "treasure_map_seller" && typeof globalThis\.document !== "undefined"/);
assert.match(touch, /persistSafariOwnerResult/);
assert.doesNotMatch(touch, /confirm\s*\(/);
assert.doesNotMatch(touch, /saveSafariPlayableRun/);

console.log("treasure map seller touch public delivery smoke: ok");
