import DATA from "./generated/canonical-shop-item-display-data.js";

export const CANONICAL_SHOP_ITEM_DISPLAY_METADATA = Object.freeze({ ...DATA.metadata });

function rowFor(itemId) {
  const id = String(itemId);
  const row = DATA.items[id];
  if (!row) throw new RangeError(`unknown canonical shop display item: ${itemId}`);
  return [id, row];
}

export function resolveCanonicalShopItemDisplay(itemId) {
  const [id, row] = rowFor(itemId);
  return Object.freeze({
    id,
    name: String(row[0]),
    pocket: Number(row[1]),
    machineKind: row[2] ?? null,
    moveId: row[3] ?? null,
  });
}

export function projectCanonicalResolvedShopBrowserDisplay(shop) {
  if (!shop || typeof shop !== "object" || Array.isArray(shop)) {
    throw new TypeError("resolved shop must be an object");
  }
  if (!Array.isArray(shop.stock)) throw new TypeError("resolved shop stock must be an array");
  if (!shop.prices || typeof shop.prices !== "object" || Array.isArray(shop.prices)) {
    throw new TypeError("resolved shop prices must be an object");
  }

  const stock = shop.stock.map((itemId) => {
    const item = resolveCanonicalShopItemDisplay(itemId);
    const price = shop.prices[item.id];
    if (!price || typeof price !== "object") {
      throw new RangeError(`resolved shop price missing for display item: ${item.id}`);
    }
    return Object.freeze({
      ...item,
      buyPrice: Number(price.buyPrice),
      sellPrice: Number(price.sellPrice),
    });
  });

  const result = {
    schema: "mapless.browser-resolved-shop-display.v1",
    id: String(shop.id ?? ""),
    surface: String(shop.surface ?? ""),
    canSell: shop.canSell === true,
    stock: Object.freeze(stock),
  };
  if (shop.poolId != null) result.poolId = String(shop.poolId);
  if (shop.weight != null) result.weight = Number(shop.weight);
  return Object.freeze(result);
}
