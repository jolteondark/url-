import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const owner = readFileSync(new URL("../runtime/safari-burning-wagon-interaction.js", import.meta.url), "utf8");

assert.match(owner, /resolveMaplessV108BurningWagonWaterReward\(event\.normal_seed, state\.day\)/,
  "Safari WATER route must delegate day-scaled reward selection to the canonical v0.9.108 owner");
assert.match(owner, /resolveMaplessV108BurningWagonFireChoices\(event\.normal_seed\)/,
  "Safari FIRE route must delegate prepared-choice generation to the canonical v0.9.108 owner");
assert.doesNotMatch(owner, /0xb17a5e|0xf1ae11|const LOW_ITEMS|deterministicItems/,
  "Safari Burning Wagon must not retain guessed LOW_ITEMS or XOR reward RNG");
assert.match(owner, /const grantedRewardItems = action === "fire" \? rewardItems\.slice\(0, 1\) : rewardItems/,
  "current FIRE presentation must grant only one of the canonical prepared choices");
assert.match(owner, /resolveRewardTransaction/,
  "Bag mutation must remain delegated to the shared reward transaction owner");

console.log("Safari Burning Wagon canonical reward smoke passed");
