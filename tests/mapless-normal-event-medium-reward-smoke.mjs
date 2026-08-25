import assert from "node:assert/strict";
import {
  MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS,
  maplessNormalEventMediumRewardPool,
  maplessNormalEventScalingValue,
  pickMaplessNormalEventMediumRewards,
  resolveMaplessNormalEventMediumReward,
} from "../runtime/mapless-normal-event-medium-reward.js";
import { MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS } from "../runtime/mapless-normal-event-small-reward.js";

const all = [...MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS, ...MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS];
const itemMeta = Object.fromEntries(all.map((id) => [id, { valid:true, pocket:"general" }]));

assert.equal(maplessNormalEventScalingValue(1), 0);
assert.equal(maplessNormalEventScalingValue(6), 1);
assert.equal(maplessNormalEventScalingValue(11), 2);
assert.deepEqual(maplessNormalEventMediumRewardPool(10, itemMeta), MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS,
  "medium rewards must remain LOW_ITEMS while scaling_value <= 1");
assert.deepEqual(maplessNormalEventMediumRewardPool(11, itemMeta), all,
  "medium rewards must become LOW_ITEMS + MID_ITEMS once scaling_value > 1");

const filtered = { ...itemMeta, POTION:{ valid:false, pocket:"general" }, NUGGET:{ valid:false, pocket:"general" } };
assert.equal(maplessNormalEventMediumRewardPool(11, filtered).includes("POTION"), false);
assert.equal(maplessNormalEventMediumRewardPool(11, filtered).includes("NUGGET"), false);

const draws = [];
const repeated = pickMaplessNormalEventMediumRewards({
  day:11,
  count:2,
  itemMeta,
  randomInt:(max) => { draws.push(max); return 0; },
});
assert.deepEqual(repeated.items, ["POTION", "POTION"], "canonical repeated draws may select duplicates");
assert.deepEqual(draws, [all.length, all.length], "one injected RNG draw is consumed per reward");

let emptyDraws = 0;
const empty = pickMaplessNormalEventMediumRewards({ day:11, count:2, itemMeta:{}, randomInt:() => { emptyDraws += 1; return 0; } });
assert.deepEqual(empty.items, []);
assert.equal(emptyDraws, 0, "empty valid pool must consume no RNG");

const reward = resolveMaplessNormalEventMediumReward({
  day:11,
  count:2,
  itemMeta,
  randomInt:() => 0,
  pockets:{ general:{ slots:[], maxSlots:20, maxPerSlot:99 } },
});
assert.equal(reward.success, true);
assert.deepEqual(reward.selectedItems, ["POTION", "POTION"]);
assert.deepEqual(reward.pockets.general.slots.filter(Boolean), [["POTION",2]],
  "duplicate selections must be granted atomically through the shared Bag owner");
assert.equal(reward.operations.filter((op) => op.op === "select_normal_event_random_item").length, 2);
assert.ok(reward.operations.some((op) => op.op === "bag_add_all" && op.item === "POTION" && op.quantity === 2));

console.log("Mapless normal-event medium reward owner smoke passed");
