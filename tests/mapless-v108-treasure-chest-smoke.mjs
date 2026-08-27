import assert from "node:assert/strict";
import {
  MAPLESS_V108_TREASURE_CHEST_TIER_CONFIG,
  MAPLESS_V108_TREASURE_CHEST_TIER_WEIGHTS,
  MAPLESS_V108_TREASURE_CHEST_REWARD_ENTRIES,
  maplessV108TreasureChestScaling,
  prepareMaplessV108TreasureChest,
  resolveMaplessV108TreasureChestReward,
} from "../runtime/mapless-v108-treasure-chest.js";

assert.deepEqual(MAPLESS_V108_TREASURE_CHEST_TIER_WEIGHTS, [["normal",65],["deluxe",28],["supreme",7]]);
assert.equal(MAPLESS_V108_TREASURE_CHEST_TIER_CONFIG.supreme.qualityBonus, 6);
assert.equal(MAPLESS_V108_TREASURE_CHEST_REWARD_ENTRIES.at(-1).id, "ABILITYPATCH");
assert.equal(maplessV108TreasureChestScaling(1), 0);
assert.equal(maplessV108TreasureChestScaling(5), 0);
assert.equal(maplessV108TreasureChestScaling(6), 1);

const calls = [];
const prepared = prepareMaplessV108TreasureChest({ kind:"treasure" }, {
  day:11,
  randomInt:(limit) => {
    calls.push(limit);
    return calls.length === 1 ? 64 : 123456;
  },
});
assert.deepEqual(calls, [100, 0x7fffffff], "canonical preparation must draw tier before chest_seed");
assert.equal(prepared.chest_tier, "normal");
assert.equal(prepared.chest_seed, 123456);
assert.equal(prepared.chest_generated_day, 11);

let replayDraws = 0;
const replay = prepareMaplessV108TreasureChest(prepared, {
  day:99,
  randomInt:() => { replayDraws += 1; return 0; },
});
assert.equal(replay, prepared, "fully hydrated chest must replay without cloning or rerolling");
assert.equal(replayDraws, 0);
assert.equal(replay.chest_generated_day, 11);

const seededOnly = prepareMaplessV108TreasureChest({ kind:"treasure", chest_tier:"deluxe" }, {
  day:4,
  randomInt:(limit) => { assert.equal(limit, 0x7fffffff); return 77; },
});
assert.equal(seededOnly.chest_tier, "deluxe");
assert.equal(seededOnly.chest_seed, 77);

let forcedDraws = 0;
const forced = prepareMaplessV108TreasureChest({ kind:"treasure" }, {
  day:3,
  forcedTier:"supreme",
  randomInt:(limit) => { forcedDraws += 1; assert.equal(limit, 0x7fffffff); return 88; },
});
assert.equal(forcedDraws, 1, "forced tier must skip the tier RNG draw and only draw chest_seed");
assert.equal(forced.chest_tier, "supreme");
assert.equal(forced.chest_seed, 88);

const rewardA = resolveMaplessV108TreasureChestReward({ kind:"treasure", chest_tier:"deluxe", chest_seed:937108 }, 11);
const rewardB = resolveMaplessV108TreasureChestReward({ kind:"treasure", chest_tier:"deluxe", chest_seed:937108 }, 11);
assert.deepEqual(rewardA, rewardB, "reward resolution must be deterministic from chest_seed");
assert.equal(rewardA.scalingValue, 2);
assert.equal(rewardA.money, 1200);
assert.ok(rewardA.items.length > 0);

console.log("mapless v0.9.108 Treasure Chest owner smoke: ok");
