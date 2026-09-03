import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const generation = "20260903-1130";

assert.match(
  index,
  new RegExp(`"\\./runtime/safari-normal-event-touch-handoff\\.js": "\\./runtime/safari-normal-event-touch-handoff\\.js\\?v=${generation}"`),
  "public import map must cache-bust the normal-event handoff that now dispatches auction",
);
assert.match(
  index,
  new RegExp(`"\\./runtime/safari-auction-interaction\\.js": "\\./runtime/safari-auction-interaction\\.js\\?v=${generation}"`),
  "public import map must pin the auction interaction owner",
);
assert.match(
  index,
  new RegExp(`normal-event-touch-presentation\\.js\\?v=${generation}`),
  "public presentation entry must cache-bust the auction UI routing",
);

console.log("auction public delivery smoke passed");
