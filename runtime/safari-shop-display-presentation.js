import { quantity } from "./bag-economy-mart-flow.js";
import { projectCanonicalResolvedShopBrowserDisplay } from "./canonical-shop-item-display.js";
import { safariShopPresentation as legacySafariShopPresentation } from "./safari-playable-integration-boundary.js";

const SELL_ITEM_PREFIX = "SELL:";

function maplessState(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("runtime variables.mapless state is required");
  }
  return state;
}

export function safariShopPresentation(runtime) {
  const state = maplessState(runtime);
  const shop = state.shop;
  if (!shop?.canonical) return legacySafariShopPresentation(runtime);

  const display = projectCanonicalResolvedShopBrowserDisplay({
    id: shop.facility_id,
    surface: shop.surface ?? "village_fixed_shop",
    canSell: shop.can_sell === true,
    stock: shop.stock,
    prices: shop.prices,
  });

  const buys = display.stock.map((item) => ({
    id: item.id,
    canonical_id: item.id,
    transaction_kind: "buy",
    name: item.name,
    label: item.name,
    pocket: item.pocket,
    machineKind: item.machineKind,
    moveId: item.moveId,
    price: item.buyPrice,
    sell_price: item.sellPrice,
    quantity: quantity(runtime.bag?.slots ?? [], item.id),
  }));
  const sells = display.canSell
    ? display.stock.flatMap((item) => {
      const owned = quantity(runtime.bag?.slots ?? [], item.id);
      if (owned <= 0) return [];
      return [{
        id: `${SELL_ITEM_PREFIX}${item.id}`,
        canonical_id: item.id,
        transaction_kind: "sell",
        name: item.name,
        label: item.name,
        pocket: item.pocket,
        machineKind: item.machineKind,
        moveId: item.moveId,
        price: item.sellPrice,
        sell_price: item.sellPrice,
        quantity: owned,
      }];
    })
    : [];

  return {
    facilityId: shop.facility_id,
    boardIndex: shop.board_index,
    money: Number(runtime.bag?.money ?? 0),
    canSell: display.canSell,
    lastTransactionResult: shop.last_transaction_result,
    items: [...buys, ...sells],
  };
}
