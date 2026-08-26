import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const owner = readFileSync(new URL("../runtime/safari-burning-wagon-interaction.js", import.meta.url), "utf8");
const presentation = readFileSync(new URL("../burning-wagon-fire-presentation.js", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(owner, /resolveMaplessV108BurningWagonWaterReward\(event\.normal_seed, state\.day\)/,
  "Safari WATER route must delegate day-scaled reward selection to the canonical v0.9.108 owner");
assert.match(owner, /resolveMaplessV108BurningWagonFireChoices\(event\.normal_seed\)/,
  "Safari FIRE route must delegate prepared-choice generation to the canonical v0.9.108 owner");
assert.doesNotMatch(owner, /0xb17a5e|0xf1ae11|const LOW_ITEMS|deterministicItems/,
  "Safari Burning Wagon must not retain guessed LOW_ITEMS or XOR reward RNG");
assert.match(owner, /result:"fire_choice_required"/,
  "plain FIRE dispatch must stop before mutation until a prepared choice is selected");
assert.match(owner, /fireChoiceToken !== "none"/,
  "FIRE dispatch must support an explicit choose-none path");
assert.match(owner, /!rewardItems\.includes\(selectedFireChoice\)/,
  "FIRE dispatch must reject rewards outside the canonical prepared choices");
assert.match(presentation, /safariBurningWagonFireChoices/,
  "FIRE presentation must obtain choices from the canonical-backed Safari owner");
assert.match(presentation, /`fire:\$\{itemId\}`/,
  "FIRE presentation must dispatch the actual selected canonical item");
assert.match(presentation, /"fire:none"/,
  "FIRE presentation must expose choose-none");
assert.match(index, /burning-wagon-fire-presentation\.js\?v=20260827-0815/,
  "physical Safari entry must load the FIRE choice sidecar");
assert.match(index, /safari-burning-wagon-interaction\.js\?v=20260827-0815/,
  "physical Safari entry must fetch the post-choice Burning Wagon owner");
assert.match(owner, /resolveRewardTransaction/,
  "Bag mutation must remain delegated to the shared reward transaction owner");

console.log("Safari Burning Wagon canonical reward smoke passed");
