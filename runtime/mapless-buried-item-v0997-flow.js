import { add } from "./bag-economy-mart-flow.js";
import { CANONICAL_SHOP_CATALOG } from "./canonical-shop-catalog.js";
import { RubyMT19937Random } from "./ruby-mt19937-random.js";

export const MAPLESS_BURIED_ITEM_V0997_CATEGORY_WEIGHTS = Object.freeze({
  medicine: 31,
  berry: 29,
  ball: 25,
  uncommon: 9,
  valuable: 4,
  machine: 2,
});

export const MAPLESS_BURIED_ITEM_V0997_POOLS = Object.freeze({
  medicine: Object.freeze(["POTION", "ANTIDOTE", "PARALYZEHEAL", "AWAKENING", "BURNHEAL", "ICEHEAL", "FRESHWATER"]),
  berry: Object.freeze(["ORANBERRY", "CHERIBERRY", "CHESTOBERRY", "PECHABERRY", "RAWSTBERRY", "ASPEARBERRY", "PERSIMBERRY"]),
  ball: Object.freeze(["POKEBALL", "PREMIERBALL", "HEALBALL", "NETBALL", "NESTBALL", "DIVEBALL"]),
  uncommon: Object.freeze(["SUPERPOTION", "GREATBALL", "FULLHEAL", "ETHER", "REVIVE", "SODAPOP", "REPEL", "SUPERREPEL"]),
  valuable: Object.freeze(["STARDUST", "PEARL", "BIGPEARL", "NUGGET"]),
});

function cloneSlots(slots = []) {
  return slots.map((slot) => slot == null ? null : [slot[0], Number(slot[1])]);
}

function unique(items) {
  return [...new Set((items ?? []).filter(Boolean))];
}

function machinePool() {
  // Canonical source delegates the machine category to MaplessFacilities.machine_pool.
  // The existing TM/TR merchant projections are the public runtime owner for that pool.
  return unique([
    ...(CANONICAL_SHOP_CATALOG.pools?.tm_merchant ?? []),
    ...(CANONICAL_SHOP_CATALOG.pools?.tr_merchant ?? []),
  ]);
}

function poolFor(category) {
  if (category === "machine") return machinePool();
  // The fixed source pools are canonical GameData::Item IDs. Do not narrow them by
  // shop-price/catalog membership: a valid buried reward need not be a mart product.
  return [...(MAPLESS_BURIED_ITEM_V0997_POOLS[category] ?? [])];
}

function fallbackItems() {
  return unique([
    ...MAPLESS_BURIED_ITEM_V0997_POOLS.medicine,
    ...MAPLESS_BURIED_ITEM_V0997_POOLS.berry,
    ...MAPLESS_BURIED_ITEM_V0997_POOLS.ball,
    ...MAPLESS_BURIED_ITEM_V0997_POOLS.uncommon,
  ]);
}

function weightedPick(weights, rng, trace) {
  const entries = Object.entries(weights).filter(([, weight]) => Number(weight) > 0);
  const total = entries.reduce((sum, [, weight]) => sum + Number(weight), 0);
  if (total <= 0) return null;
  const roll = rng.randInt(total);
  trace.push({ op: "buried_item_category_roll", roll, limit: total });
  let remaining = roll;
  for (const [key, weight] of entries) {
    remaining -= Number(weight);
    if (remaining < 0) return key;
  }
  return entries.at(-1)?.[0] ?? null;
}

function chooseItem(rng, trace) {
  const category = weightedPick(MAPLESS_BURIED_ITEM_V0997_CATEGORY_WEIGHTS, rng, trace) ?? "medicine";
  let pool = poolFor(category);
  if (pool.length === 0) pool = fallbackItems();
  if (pool.length === 0) return null;
  const index = rng.randInt(pool.length);
  const item = pool[index];
  trace.push({ op: "buried_item_pool_roll", category, index, limit: pool.length, item });
  return item;
}

export function buriedItemSeedV0997(day, index) {
  const normalizedDay = Math.max(1, Math.trunc(Number(day) || 1));
  const cell = Math.max(0, Math.trunc(Number(index) || 0)) + 1;
  return ((Math.imul(normalizedDay, 1_000_003) ^ Math.imul(cell, 97_409) ^ 0x4D425249) & 0x7fffffff) >>> 0;
}

export function resolveMaplessBuriedItemV0997({
  day,
  index,
  slots = [],
  maxSlots = 20,
  maxPerSlot = 99,
} = {}) {
  if (!Number.isInteger(index) || index < 0 || index > 7) throw new RangeError("buried-item index must be 0..7");
  const seed = buriedItemSeedV0997(day, index);
  const rng = new RubyMT19937Random(seed);
  const nextSlots = cloneSlots(slots);
  const trace = [{ op: "buried_item_seed", seed, day: Math.max(1, Math.trunc(Number(day) || 1)), index }];
  const tried = new Set();

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const item = chooseItem(rng, trace);
    if (!item) break;
    if (tried.has(item)) {
      trace.push({ op: "buried_item_duplicate_retry", attempt, item });
      continue;
    }
    tried.add(item);
    if (add(nextSlots, maxSlots, maxPerSlot, item, 1)) {
      trace.push({ op: "buried_item_reward", source: "weighted", attempt, item, quantity: 1 });
      return { result: "rewarded", success: true, item, quantity: 1, seed, slots: nextSlots, operations: trace };
    }
    trace.push({ op: "buried_item_bag_rejected", attempt, item });
  }

  const fallback = fallbackItems();
  if (fallback.length > 0) {
    const start = rng.randInt(fallback.length);
    trace.push({ op: "buried_item_fallback_start", start, limit: fallback.length });
    for (let offset = 0; offset < fallback.length; offset += 1) {
      const item = fallback[(start + offset) % fallback.length];
      if (tried.has(item)) continue;
      if (add(nextSlots, maxSlots, maxPerSlot, item, 1)) {
        trace.push({ op: "buried_item_reward", source: "fallback", offset, item, quantity: 1 });
        return { result: "rewarded", success: true, item, quantity: 1, seed, slots: nextSlots, operations: trace };
      }
    }
  }

  trace.push({ op: "buried_item_no_room" });
  return { result: "no_room", success: false, item: null, quantity: 0, seed, slots: nextSlots, operations: trace };
}
