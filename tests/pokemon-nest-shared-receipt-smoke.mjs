import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../runtime/safari-pokemon-nest-interaction.js", import.meta.url), "utf8");

assert.match(source, /commitSafariBagEconomyReceipt/,
  "Pokemon Nest should commit rewards through the shared Safari Bag/Economy receipt owner");
assert.match(source, /commitSafariBagEconomyReceipt\(runtime, \{ reward:transaction \}\)/,
  "Pokemon Nest search reward should pass the resolved reward transaction to the shared receipt");
assert.doesNotMatch(source, /runtime\.bag\.slots\s*=/,
  "Pokemon Nest must not directly mutate Bag slots");
assert.doesNotMatch(source, /function\s+applyReward\s*\(/,
  "Pokemon Nest must not retain a local Bag reward mutation helper");
assert.doesNotMatch(source, /\.\.\.\(transaction\?\.operations \?\? \[\]\)/,
  "Pokemon Nest must not duplicate transaction operations outside the shared receipt");

console.log("pokemon-nest-shared-receipt-smoke: ok");
