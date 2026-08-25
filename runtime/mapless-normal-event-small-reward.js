import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";

export const MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS = Object.freeze([
  "POTION", "ANTIDOTE", "PARALYZEHEAL", "AWAKENING", "BURNHEAL", "ICEHEAL",
  "POKEBALL", "ORANBERRY", "PECHABERRY", "CHERIBERRY", "FRESHWATER", "SODAPOP",
]);

export function pickMaplessNormalEventSmallRewards({ count = 1, randomInt, itemMeta = {} } = {}) {
  if (!Number.isInteger(count) || count < 0) throw new RangeError("count must be a non-negative integer");
  if (typeof randomInt !== "function") throw new TypeError("randomInt must be a function");
  const pool = MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS.filter((item) => itemMeta[item]?.valid);
  if (pool.length === 0 || count === 0) return { items: [], operations: [] };
  const items = [];
  const operations = [];
  for (let draw = 0; draw < count; draw += 1) {
    const index = randomInt(pool.length);
    if (!Number.isInteger(index) || index < 0 || index >= pool.length) throw new RangeError("randomInt returned an out-of-range index");
    const item = pool[index];
    items.push(item);
    operations.push({ op: "select_normal_event_random_item", size: "small", draw, item });
  }
  return { items, operations };
}

export function resolveMaplessNormalEventSmallReward(input = {}) {
  const selected = pickMaplessNormalEventSmallRewards(input);
  const reward = resolveRewardTransaction({
    pockets: input.pockets,
    itemMeta: input.itemMeta,
    items: selected.items,
  });
  return { ...reward, selectedItems: selected.items, operations: [...selected.operations, ...reward.operations] };
}
