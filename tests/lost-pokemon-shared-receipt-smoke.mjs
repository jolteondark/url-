import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lostPokemon = readFileSync(new URL("../runtime/safari-lost-pokemon-interaction.js", import.meta.url), "utf8");
const receipt = readFileSync(new URL("../runtime/safari-bag-economy-receipt.js", import.meta.url), "utf8");

assert.match(lostPokemon, /commitSafariBagEconomyReceipt/,
  "Lost Pokemon should commit item rewards and berry exchange through the shared Safari Bag\/Economy receipt owner");
assert.match(lostPokemon, /commitSafariBagEconomyReceipt\(runtime, \{ reward:transaction \}\)/,
  "Lost Pokemon should pass resolved reward transactions to the shared receipt");
assert.doesNotMatch(lostPokemon, /runtime\.bag\.slots\s*=/,
  "Lost Pokemon must not directly mutate Bag slots");
assert.doesNotMatch(lostPokemon, /function\s+applyReward\s*\(/,
  "Lost Pokemon must not retain a local Bag reward mutation helper");
assert.match(receipt, /reward\?\.consumed/,
  "Shared receipt should preserve resolved consumed items for exchange transactions");
assert.match(receipt, /op:"runtime_remove_item"/,
  "Shared receipt should expose consumed-item runtime operations");

console.log("lost-pokemon-shared-receipt-smoke: ok");
