import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import {
  MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS,
  maplessNormalEventScalingValue,
} from "./mapless-normal-event-medium-reward.js";

export const MAPLESS_NORMAL_EVENT_LARGE_REWARD_ITEMS = Object.freeze([
  "MAXPOTION", "FULLRESTORE", "MAXETHER", "ELIXIR", "MAXREVIVE", "RARECANDY",
  "STARPIECE", "COMETSHARD", "PPUP", "ABILITYCAPSULE", "FASTBALL", "LEVELBALL",
  "LUREBALL", "HEAVYBALL", "LOVEBALL", "FRIENDBALL", "MOONBALL", "DREAMBALL",
]);

export function maplessNormalEventLargeRewardPool(day, itemMeta = {}) {
  const canonical = maplessNormalEventScalingValue(day) <= 2
    ? MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS
    : [...MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS, ...MAPLESS_NORMAL_EVENT_LARGE_REWARD_ITEMS];
  return canonical.filter((item) => itemMeta[item]?.valid);
}

export function pickMaplessNormalEventLargeRewards({ day = 1, count = 1, randomInt, itemMeta = {} } = {}) {
  if (!Number.isInteger(count) || count < 0) throw new RangeError("count must be a non-negative integer");
  if (typeof randomInt !== "function") throw new TypeError("randomInt must be a function");
  const pool = maplessNormalEventLargeRewardPool(day, itemMeta);
  if (pool.length === 0 || count === 0) return { items: [], operations: [] };
  const items = [];
  const operations = [];
  for (let draw = 0; draw < count; draw += 1) {
    const index = randomInt(pool.length);
    if (!Number.isInteger(index) || index < 0 || index >= pool.length) throw new RangeError("randomInt returned an out-of-range index");
    const item = pool[index];
    items.push(item);
    operations.push({ op: "select_normal_event_random_item", size: "large", draw, item });
  }
  return { items, operations };
}

export function resolveMaplessNormalEventLargeReward(input = {}) {
  const selected = pickMaplessNormalEventLargeRewards(input);
  const reward = resolveRewardTransaction({
    pockets: input.pockets,
    itemMeta: input.itemMeta,
    items: selected.items,
  });
  return { ...reward, selectedItems: selected.items, operations: [...selected.operations, ...reward.operations] };
}
