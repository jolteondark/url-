import CATALOG from "./generated/canonical-shop-catalog-data.js";

export const CANONICAL_SHOP_CATALOG = CATALOG;
export const CANONICAL_SHOP_METADATA = Object.freeze({ ...CATALOG.metadata });

function unique(values) {
  return [...new Set(values)];
}

function selection(pool, count, indices = []) {
  const remaining = [...pool];
  const chosen = [];
  const wanted = count == null ? remaining.length : Math.min(Math.max(0, Number(count)), remaining.length);
  for (let i = 0; i < wanted; i += 1) {
    const raw = indices[i] ?? i;
    const index = ((Number(raw) % remaining.length) + remaining.length) % remaining.length;
    chosen.push(remaining.splice(index, 1)[0]);
  }
  return chosen;
}

export function resolveCanonicalBoardShopType(roll) {
  const entries = Object.entries(CATALOG.boardShops);
  const total = entries.reduce((sum, [, rule]) => sum + Number(rule.weight), 0);
  if (!Number.isInteger(roll)) throw new TypeError("shop roll must be an integer");
  let remaining = ((roll % total) + total) % total;
  for (const [id, rule] of entries) {
    remaining -= Number(rule.weight);
    if (remaining < 0) return id;
  }
  return entries.at(-1)[0];
}

export function canonicalShopPrice(itemId) {
  const row = CATALOG.prices[String(itemId)];
  if (!row) throw new RangeError(`unknown canonical shop item: ${itemId}`);
  return Object.freeze({ item: String(itemId), buyPrice: Number(row[0]), sellPrice: Number(row[1]) });
}

export function resolveCanonicalBoardShop(shopType, { sampleIndices = [] } = {}) {
  const id = String(shopType);
  const rule = CATALOG.boardShops[id];
  if (!rule) throw new RangeError(`unknown canonical board shop: ${shopType}`);
  const pool = CATALOG.pools[rule.pool] ?? [];
  const stock = selection(pool, rule.sampleCount, sampleIndices);
  return Object.freeze({
    id,
    surface: "board",
    weight: Number(rule.weight),
    canSell: Boolean(rule.canSell),
    stock: Object.freeze(stock),
    prices: Object.freeze(Object.fromEntries(stock.map((item) => [item, canonicalShopPrice(item)]))),
  });
}

export function resolveCanonicalVillageShop(shopType, { sampleIndices = [], heldCategory = "type_boost" } = {}) {
  const id = String(shopType);
  const rule = CATALOG.villageShops[id];
  if (!rule) throw new RangeError(`unknown canonical village shop: ${shopType}`);
  const poolId = rule.pool === "held_random_category" ? String(heldCategory) : rule.pool;
  if (!CATALOG.pools[poolId]) throw new RangeError(`unknown canonical held shop category: ${heldCategory}`);
  const stock = selection(unique(CATALOG.pools[poolId]), rule.sampleCount, sampleIndices);
  return Object.freeze({
    id,
    surface: "village",
    poolId,
    canSell: Boolean(rule.canSell),
    stock: Object.freeze(stock),
    prices: Object.freeze(Object.fromEntries(stock.map((item) => [item, canonicalShopPrice(item)]))),
  });
}

export function canonicalResolvedShopOffer(shop, itemId, kind = "buy") {
  const item = String(itemId);
  if (!shop?.stock?.includes(item)) throw new RangeError(`item is outside resolved shop stock: ${itemId}`);
  const price = canonicalShopPrice(item);
  const normalizedKind = String(kind);
  if (normalizedKind === "buy") return Object.freeze({ kind: "buy", item, unitPrice: price.buyPrice, conditionPassed: true });
  if (normalizedKind === "sell") return Object.freeze({ kind: "sell", item, unitPrice: price.sellPrice, conditionPassed: Boolean(shop.canSell) });
  throw new RangeError(`unsupported canonical shop transaction: ${kind}`);
}
