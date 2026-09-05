import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../runtime/safari-berry-thief-interaction.js", import.meta.url), "utf8");

assert.match(source, /commitSafariBagEconomyReceipt/,
  "Berry Thief should commit Bag mutations through the shared Safari Bag/Economy receipt owner");
assert.doesNotMatch(source, /runtime\.bag\.slots\s*=/,
  "Berry Thief must not directly replace Safari Bag slots");
assert.doesNotMatch(source, /function\s+applyTransaction\s*\(/,
  "Berry Thief must not retain a local Bag transaction mutation helper");
assert.match(source, /commitSafariBagEconomyReceipt\(runtime, \{ reward:resolved \}\)/,
  "Berry Thief post-Battle and rare-berry rewards should commit resolved transactions through the shared receipt");
assert.match(source, /commitSafariBagEconomyReceipt\(runtime, \{ reward:debit \}\)/,
  "Berry Thief bait consumption should commit through the shared receipt");
assert.doesNotMatch(source, /\.\.\.resolved\.operations[^\n]*\.\.\.receipt\.operations/,
  "Berry Thief must not duplicate resolved transaction operations outside the shared receipt");

console.log("berry-thief-shared-receipt-smoke: ok");
