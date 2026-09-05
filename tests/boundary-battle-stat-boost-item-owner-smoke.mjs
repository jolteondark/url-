import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const boostOwner = readFileSync(new URL("../runtime/safari-battle-stat-boost-item-use.js", import.meta.url), "utf8");
const sharedItemOwner = readFileSync(new URL("../runtime/safari-battle-item-mutation-owner.js", import.meta.url), "utf8");
const boundary = readFileSync(new URL("../runtime/safari-playable-integration-boundary.js", import.meta.url), "utf8");

assert.doesNotMatch(boostOwner, /battle\.origin === ["']boundary_trial["']/,
  "shared Battle stat-boost owner must not reject boundary trials");
assert.doesNotMatch(boostOwner, /boundary_owner_required/,
  "obsolete boundary-only stat-boost rejection must stay removed");
assert.match(sharedItemOwner, /isSafariBattleStatBoostItem\(itemId\)[\s\S]*useSafariBattleStatBoostItem\(runtime/,
  "shared Battle ITEM mutation owner must dispatch stat-boost items through the canonical stat-stage owner");
assert.match(boundary, /applySafariBattleItemMutation\(runtime, options\)/,
  "boundary ITEM command must delegate mutation to the shared Battle item owner");
assert.match(boundary, /playerActionConsumedWithoutMove:\s*true/,
  "successful boundary ITEM use must consume the player's action through the shared round owner");

console.log("boundary Battle stat-boost item owner smoke: ok");
