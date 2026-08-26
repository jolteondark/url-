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
assert.match(owner, /1 \+ rng\.randInt\(2\)/,
  "Hot Spring and water-route count must use the canonical 1..2 draw");
assert.match(hotSpring, /resolveMaplessV108HotSpringBottleReward\(event\.normal_seed\)/,
  "Hot Spring Safari adapter must delegate bottle selection to the canonical owner");
assert.doesNotMatch(hotSpring, /0xb0771e|const LOW_ITEMS/,
  "Hot Spring must not keep the Safari-local guessed pool or XOR salt");
assert.match(floodedRiver, /0x51f15e|0x1ce1ce/,
  "Flooded River remains a Factory follow-up until it is wired to the shared owner");

console.log("Mapless v0.9.108 event-local item reward smoke passed");
