import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const presentation = await readFile(new URL("../item-collector-touch-presentation.js", import.meta.url), "utf8");
const touch = await readFile(new URL("../runtime/safari-item-collector-touch.js", import.meta.url), "utf8");
const manifest = await readFile(new URL("../board-presentation-manifest.json", import.meta.url), "utf8");
const fallback = await readFile(new URL("../deferred-ui-loader.js", import.meta.url), "utf8");

assert.match(presentation, /openSafariItemCollectorTouch/);
assert.doesNotMatch(presentation, /state\.board_revealed\[index\]\s*=|state\.board_visited\[index\]\s*=/);
assert.match(touch, /safariItemCollectorPresentation/);
assert.match(touch, /state\.board_revealed\[index\] = true/);
assert.match(touch, /state\.board_visited\[index\] = true/);
assert.match(touch, /__maplessNormalEventUi/);
assert.match(manifest, /item-collector-touch-presentation\.js\?v=20260908-0900/);
assert.match(fallback, /item-collector-touch-presentation\.js\?v=20260908-0900/);

console.log("item collector touch owner adapter smoke: ok");
