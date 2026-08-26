import { resolveRewardTransaction } from "./bag-economy-reward-transaction.js";
import {
  MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS,
  resolveMaplessNormalEventSmallReward,
} from "./mapless-normal-event-small-reward.js";
import { hasMaplessV108ItemMetadata, maplessV108ItemMetadata } from "./mapless-v108-item-metadata.js";
import { RubyMT19937Random } from "./ruby-mt19937-random.js";

export const MAPLESS_HONEY_TREE_FALLBACK_BERRIES_V108 = Object.freeze([
  "ORANBERRY", "SITRUSBERRY", "PECHABERRY",
]);

function seedOf(event) {
  const seed = Number(event?.normal_seed);
  if (!Number.isInteger(seed)) throw new TypeError("event.normal_seed must be an integer");
  return seed >>> 0;
}
function generalPockets(slots = []) { return { general: { slots, maxSlots:20, maxPerSlot:99 } }; }
function rewardMeta(ids) {
  return Object.fromEntries(Array.from(new Set(ids)).map((id) => [id, { valid:hasMaplessV108ItemMetadata(id), pocket:"general" }]));
}
function compareRubyItemIds(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

export function maplessHoneyTreeOwnedBerryEntriesV108(slots = []) {
  const quantities = new Map();
  for (const slot of slots ?? []) {
    if (!Array.isArray(slot) || slot.length < 2) continue;
    const id = String(slot[0] ?? ""), qty = Number(slot[1] ?? 0);
    if (!Number.isInteger(qty) || qty <= 0) continue;
    const meta = maplessV108ItemMetadata(id);
    if (!meta?.berry) continue;
    quantities.set(id, (quantities.get(id) ?? 0) + qty);
  }
  return [...quantities.entries()]
    .map(([id, qty]) => ({ id, qty, price:Number(maplessV108ItemMetadata(id)?.price ?? 0) }))
    .sort((a, b) => a.price - b.price || compareRubyItemIds(a.id, b.id));
}

export function resolveHoneyTreeHoneyGrantV108({ slots = [], count = 1 } = {}) {
  if (!Number.isInteger(count) || count < 1) throw new RangeError("count must be a positive integer");
  const items = Array(count).fill("HONEY");
  return resolveRewardTransaction({ pockets:generalPockets(slots), itemMeta:rewardMeta(items), items });
}

export function resolveHoneyTreeActionRewardV108({ event, action, slots = [], sharedRandomInt } = {}) {
  if (action === "leave" || action === "shake") return { reward:null, selectedItems:[], honeyCount:0, operations:[] };
  const localRng = new RubyMT19937Random(seedOf(event));
  if (action === "bug") {
    if (hasMaplessV108ItemMetadata("HONEY")) {
      const honeyCount = 2 + localRng.randInt(2), reward = resolveHoneyTreeHoneyGrantV108({ slots, count:honeyCount });
      return { reward, selectedItems:Array(honeyCount).fill("HONEY"), honeyCount, operations:reward.operations };
    }
    if (typeof sharedRandomInt !== "function") throw new TypeError("sharedRandomInt must be a function for Honey fallback");
    const reward = resolveMaplessNormalEventSmallReward({ count:2, randomInt:sharedRandomInt, pockets:generalPockets(slots), itemMeta:rewardMeta(MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS) });
    return { reward, selectedItems:reward.selectedItems, honeyCount:0, operations:reward.operations };
  }
  if (action !== "bark") throw new RangeError(`unsupported Honey Tree reward action: ${action}`);
  const roll = Number(event?.normal_data?.bark_roll);
  if (!Number.isFinite(roll)) throw new Error("honey_tree bark_roll unresolved");
  if (roll >= 75) return { reward:null, selectedItems:[], honeyCount:0, operations:[] };
  if (roll < 50) {
    const owned = maplessHoneyTreeOwnedBerryEntriesV108(slots);
    const pool = owned.length ? owned.map((entry) => entry.id) : MAPLESS_HONEY_TREE_FALLBACK_BERRIES_V108.filter(hasMaplessV108ItemMetadata);
    if (!pool.length) return { reward:null, selectedItems:[], honeyCount:0, operations:[] };
    const item = pool[localRng.randInt(pool.length)];
    const reward = resolveRewardTransaction({ pockets:generalPockets(slots), itemMeta:rewardMeta([item]), items:[item] });
    return { reward, selectedItems:[item], honeyCount:0, operations:reward.operations };
  }
  if (typeof sharedRandomInt !== "function") throw new TypeError("sharedRandomInt must be a function for bark small reward");
  const reward = resolveMaplessNormalEventSmallReward({ count:1, randomInt:sharedRandomInt, pockets:generalPockets(slots), itemMeta:rewardMeta(MAPLESS_NORMAL_EVENT_SMALL_REWARD_ITEMS) });
  return { reward, selectedItems:reward.selectedItems, honeyCount:0, operations:reward.operations };
}
