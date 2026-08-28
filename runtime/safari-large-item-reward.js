import { MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS } from "./mapless-normal-event-medium-reward.js";
import {
  MAPLESS_NORMAL_EVENT_LARGE_REWARD_ITEMS,
  resolveMaplessNormalEventLargeReward,
} from "./mapless-normal-event-large-reward.js";

const SAFARI_BAG_MAX_SLOTS = 20;
const SAFARI_BAG_MAX_PER_SLOT = 99;
const SAFARI_LARGE_REWARD_ITEMS = Object.freeze([
  ...new Set([...MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS, ...MAPLESS_NORMAL_EVENT_LARGE_REWARD_ITEMS]),
]);
const ITEM_META = Object.freeze(Object.fromEntries(
  SAFARI_LARGE_REWARD_ITEMS.map((id) => [id, Object.freeze({ valid:true, pocket:"general" })]),
));

function pockets(runtime) {
  return {
    general:{
      slots:runtime?.bag?.slots ?? [],
      maxSlots:SAFARI_BAG_MAX_SLOTS,
      maxPerSlot:SAFARI_BAG_MAX_PER_SLOT,
    },
  };
}

export function preflightSafariSharedLargeItemReward(runtime, day, randomInt, count = 1) {
  return resolveMaplessNormalEventLargeReward({
    day,
    count,
    randomInt,
    pockets:pockets(runtime),
    itemMeta:ITEM_META,
  });
}

export function applySafariLargeItemReward(runtime, reward) {
  if (!reward?.success) return [];
  runtime.bag ??= { slots:[], money:0 };
  runtime.bag.slots = reward.pockets.general.slots.filter(Boolean);
  return reward.granted.map((entry) => ({ op:"runtime_grant_item", item:entry.item, quantity:entry.quantity }));
}
