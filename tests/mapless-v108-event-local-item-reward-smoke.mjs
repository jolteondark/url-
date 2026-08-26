import assert from "node:assert/strict";
import fs from "node:fs";

const owner = fs.readFileSync(new URL("../runtime/mapless-v108-event-local-item-reward.js", import.meta.url), "utf8");
const hotSpring = fs.readFileSync(new URL("../runtime/safari-hot-spring-interaction.js", import.meta.url), "utf8");
const floodedRiver = fs.readFileSync(new URL("../runtime/safari-flooded-river-interaction.js", import.meta.url), "utf8");

assert.match(owner, /MAPLESS_V108_DRINK_ITEMS[\s\S]*FRESHWATER[\s\S]*SODAPOP[\s\S]*LEMONADE[\s\S]*MOOMOOMILK/,
  "shared owner must preserve the canonical v0.9.108 drink pool order");
assert.match(owner, /resolveMaplessV108HotSpringBottleReward/,
  "shared owner must expose Hot Spring bottle selection");
assert.match(owner, /resolveMaplessV108FloodedRiverReward/,
  "shared owner must expose Flooded River water\/ice selection for Factory reuse");
assert.match(owner, /resolveMaplessV108BurningWagonWaterReward/,
  "shared owner must expose Burning Wagon WATER reward selection");
assert.match(owner, /resolveMaplessV108BurningWagonFireChoices/,
  "shared owner must expose Burning Wagon prepared FIRE choices");
assert.match(owner, /resolveMaplessV108BurningWagonWaterReward[\s\S]*2 \+ rng\.randInt\(2\)/,
  "Burning Wagon WATER must use the canonical 2..3 reward count");
assert.match(owner, /maplessNormalEventScalingValue\(day\) <= 1[\s\S]*MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS[\s\S]*MAPLESS_V108_MID_ITEMS/,
  "Burning Wagon WATER must switch from LOW to LOW+MID after the early-day scaling boundary");
assert.match(owner, /resolveMaplessV108BurningWagonFireChoices[\s\S]*rng\.randInt\(100\)[\s\S]*drawUnique\(pool, 3, rng\)/,
  "Burning Wagon FIRE must consume manual_roll first, then draw three unique prepared choices from the same RNG");
assert.match(owner, /MAPLESS_V108_LARGE_ITEMS[\s\S]*MAPLESS_V108_MID_ITEMS/,
  "Burning Wagon FIRE must preserve the canonical LARGE+MID source ordering");
assert.match(hotSpring, /resolveMaplessV108HotSpringBottleReward\(event\.normal_seed\)/,
  "Hot Spring Safari adapter must delegate bottle selection to the canonical owner");
assert.doesNotMatch(hotSpring, /0xb0771e|const LOW_ITEMS/,
  "Hot Spring must not keep the Safari-local guessed pool or XOR salt");
assert.match(floodedRiver, /resolveMaplessV108FloodedRiverReward\(event\.normal_seed, action\)/,
  "Flooded River must remain wired to the canonical owner after #915");
assert.doesNotMatch(floodedRiver, /0x51f15e|0x1ce1ce/,
  "Flooded River must not regress to the old Safari-local XOR reward salts");

console.log("Mapless v0.9.108 event-local item reward smoke passed");
