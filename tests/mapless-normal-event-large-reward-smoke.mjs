import assert from "node:assert/strict";
import {
  MAPLESS_NORMAL_EVENT_LARGE_REWARD_ITEMS,
  maplessNormalEventLargeRewardPool,
  pickMaplessNormalEventLargeRewards,
  resolveMaplessNormalEventLargeReward,
} from "../runtime/mapless-normal-event-large-reward.js";
import { MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS } from "../runtime/mapless-normal-event-medium-reward.js";

const all = [...MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS, ...MAPLESS_NORMAL_EVENT_LARGE_REWARD_ITEMS];
const itemMeta = Object.fromEntries(all.map((id) => [id, { valid:true, pocket:"general" }]));

assert.deepEqual(maplessNormalEventLargeRewardPool(15, itemMeta), MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS,
  "large rewards must remain MID_ITEMS while scaling_value <= 2");
assert.deepEqual(maplessNormalEventLargeRewardPool(16, itemMeta), all,
  "large rewards must become MID_ITEMS + LARGE_ITEMS once scaling_value > 2");

const filtered = { ...itemMeta, SUPERPOTION:{ valid:false, pocket:"general" }, MAXPOTION:{ valid:false, pocket:"general" } };
assert.equal(maplessNormalEventLargeRewardPool(16, filtered).includes("SUPERPOTION"), false);
assert.equal(maplessNormalEventLargeRewardPool(16, filtered).includes("MAXPOTION"), false);

const draws = [];
const repeated = pickMaplessNormalEventLargeRewards({
  day:16,
  count:2,
  itemMeta,
  randomInt:(max) => { draws.push(max); return 0; },
});
assert.deepEqual(repeated.items, ["SUPERPOTION", "SUPERPOTION"], "canonical repeated draws may select duplicates");
assert.deepEqual(draws, [all.length, all.length], "one injected RNG draw is consumed per reward");

let emptyDraws = 0;
const empty = pickMaplessNormalEventLargeRewards({ day:16, count:2, itemMeta:{}, randomInt:() => { emptyDraws += 1; return 0; } });
assert.deepEqual(empty.items, []);
assert.equal(emptyDraws, 0, "empty valid pool must consume no RNG");

const reward = resolveMaplessNormalEventLargeReward({
  day:16,
  count:2,
  itemMeta,
  randomInt:() => 0,
  pockets:{ general:{ slots:[], maxSlots:20, maxPerSlot:99 } },
});
assert.equal(reward.success, true);
assert.deepEqual(reward.selectedItems, ["SUPERPOTION", "SUPERPOTION"]);
assert.deepEqual(reward.pockets.general.slots.filter(Boolean), [["SUPERPOTION",2]],
  "duplicate selections must be granted atomically through the shared Bag owner");
assert.equal(reward.operations.filter((op) => op.op === "select_normal_event_random_item").length, 2);
assert.ok(reward.operations.some((op) => op.op === "bag_add_all" && op.item === "SUPERPOTION" && op.quantity === 2));

console.log("Mapless normal-event large reward owner smoke passed");
