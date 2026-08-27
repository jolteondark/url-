import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

assert.match(html, /\.\/runtime\/safari-miner-interaction\.js\?v=20260828-0605/);
assert.match(html, /\.\/runtime\/safari-normal-event-pokemon-grant\.js\?v=20260828-0605/);
assert.doesNotMatch(html, /\.\/runtime\/safari-miner-interaction\.js\?v=20260828-0415/);
assert.doesNotMatch(html, /\.\/runtime\/safari-normal-event-pokemon-grant\.js\?v=20260827-2005/);

console.log("Safari Miner post-#967 cache handoff smoke passed");
