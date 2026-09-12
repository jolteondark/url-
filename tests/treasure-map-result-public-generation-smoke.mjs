import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const staleGeneration = "20260911-1030";
const currentGeneration = "20260913-0600";

assert.doesNotMatch(
  index,
  new RegExp(`"\\./runtime/safari-treasure-map-result-interaction\\.js": "\\./runtime/safari-treasure-map-result-interaction\\.js\\?v=${staleGeneration}"`),
  "public import map must not retain the pre-#1564 Treasure Map result generation",
);
assert.match(
  index,
  new RegExp(`"\\./runtime/safari-treasure-map-result-interaction\\.js": "\\./runtime/safari-treasure-map-result-interaction\\.js\\?v=${currentGeneration}"`),
  "public import map must publish the post-#1564 Treasure Map result owner",
);

console.log("Treasure Map result public generation smoke: PASS");
