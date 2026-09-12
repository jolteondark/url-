import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const normalEventPresentation = await readFile(new URL("../normal-event-touch-presentation.js", import.meta.url), "utf8");
const compatibilityPresentation = await readFile(new URL("../item-collector-touch-presentation.js", import.meta.url), "utf8");
const touchOwner = await readFile(new URL("../runtime/safari-item-collector-touch.js", import.meta.url), "utf8");

const generation = "20260912-2100";
assert.match(index, new RegExp(`"\\./runtime/safari-item-collector-interaction\\.js": "\\./runtime/safari-item-collector-interaction\\.js\\?v=${generation}"`));
assert.match(index, new RegExp(`"\\./runtime/safari-item-collector-touch\\.js": "\\./runtime/safari-item-collector-touch\\.js\\?v=${generation}"`));
assert.match(normalEventPresentation, /item_collector:"\.\/runtime\/safari-item-collector-interaction\.js"/);
assert.match(compatibilityPresentation, /from "\.\/runtime\/safari-item-collector-touch\.js"/);
assert.match(touchOwner, /from "\.\/safari-item-collector-interaction\.js"/);
assert.doesNotMatch(normalEventPresentation, /safari-item-collector-interaction\.js\?v=/);
assert.doesNotMatch(compatibilityPresentation, /safari-item-collector-touch\.js\?v=/);
assert.doesNotMatch(touchOwner, /safari-item-collector-interaction\.js\?v=/);

console.log("item collector public owner generation smoke: ok");
