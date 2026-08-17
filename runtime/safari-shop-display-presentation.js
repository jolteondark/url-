import { quantity } from "./bag-economy-mart-flow.js";
import { projectCanonicalResolvedShopBrowserDisplay } from "./canonical-shop-item-display.js";
import { safariShopPresentation as legacySafariShopPresentation } from "./safari-playable-integration-boundary-return.js";

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

  return {
    facilityId: shop.facility_id,
    boardIndex: shop.board_index,
    money: Number(runtime.bag?.money ?? 0),
    lastTransactionResult: shop.last_transaction_result,
    items: display.stock.map((item) => ({
      id: item.id,
      name: item.name,
      label: item.name,
      pocket: item.pocket,
      machineKind: item.machineKind,
      moveId: item.moveId,
      price: item.buyPrice,
      sell_price: item.sellPrice,
      quantity: quantity(runtime.bag?.slots ?? [], item.id),
    })),
  };
}
