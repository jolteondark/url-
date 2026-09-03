import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const routingGeneration = "20260903-1130";
const presentationGeneration = "20260903-1200";

assert.match(
  index,
  new RegExp(`"\\./runtime/safari-normal-event-touch-handoff\\.js": "\\./runtime/safari-normal-event-touch-handoff\\.js\\?v=${routingGeneration}"`),
  "public import map must cache-bust the normal-event handoff that dispatches auction",
);
assert.match(
  index,
  new RegExp(`"\\./runtime/safari-auction-interaction\\.js": "\\./runtime/safari-auction-interaction\\.js\\?v=${presentationGeneration}"`),
  "public import map must pin the current auction presentation owner",
);
assert.match(
  index,
  new RegExp(`"\\./runtime/canonical-item-presentation\\.js": "\\./runtime/canonical-item-presentation\\.js\\?v=${presentationGeneration}"`),
  "public import map must pin the shared canonical item presentation resolver",
);
assert.match(
  index,
  new RegExp(`normal-event-touch-presentation\\.js\\?v=${routingGeneration}`),
  "public presentation entry may remain on the routing generation when its code is unchanged",
);

console.log("auction public delivery smoke passed");
