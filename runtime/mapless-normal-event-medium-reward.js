import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import { MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS } from "./mapless-normal-event-small-reward.js";

export const MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS = Object.freeze([
  "SUPERPOTION", "HYPERPOTION", "FULLHEAL", "ETHER", "GREATBALL", "ULTRABALL",
  "QUICKBALL", "DUSKBALL", "TIMERBALL", "REVIVE", "LEMONADE", "MOOMOOMILK",
  "NUGGET", "STARDUST",
]);

export function maplessNormalEventScalingValue(day) {
  const normalizedDay = Math.max(1, Math.trunc(Number(day) || 1));
  return Math.max(0, Math.floor((normalizedDay - 1) / 5));
}

export function maplessNormalEventMediumRewardPool(day, itemMeta = {}) {
  const canonical = maplessNormalEventScalingValue(day) <= 1
    ? MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS
    : [...MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS, ...MAPLESS_NORMAL_EVENT_MID_REWARD_ITEMS];
  return canonical.filter((item) => itemMeta[item]?.valid);
}

export function pickMaplessNormalEventMediumRewards({ day = 1, count = 1, randomInt, itemMeta = {} } = {}) {
  if (!Number.isInteger(count) || count < 0) throw new RangeError("count must be a non-negative integer");
  if (typeof randomInt !== "function") throw new TypeError("randomInt must be a function");
  const pool = maplessNormalEventMediumRewardPool(day, itemMeta);
  if (pool.length === 0 || count === 0) return { items: [], operations: [] };
  const items = [];
  const operations = [];
  for (let draw = 0; draw < count; draw += 1) {
    const index = randomInt(pool.length);
    if (!Number.isInteger(index) || index < 0 || index >= pool.length) throw new RangeError("randomInt returned an out-of-range index");
    const item = pool[index];
    items.push(item);
    operations.push({ op: "select_normal_event_random_item", size: "medium", draw, item });
  }
  return { items, operations };
}

export function resolveMaplessNormalEventMediumReward(input = {}) {
  const selected = pickMaplessNormalEventMediumRewards(input);
  const reward = resolveRewardTransaction({
    pockets: input.pockets,
    itemMeta: input.itemMeta,
    items: selected.items,
  });
  return { ...reward, selectedItems: selected.items, operations: [...selected.operations, ...reward.operations] };
}
