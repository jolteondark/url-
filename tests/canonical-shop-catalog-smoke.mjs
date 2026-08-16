import assert from "node:assert/strict";
import {
  CANONICAL_BOARD_SHOP_ORDER,
  CANONICAL_SHOP_METADATA,
  resolveCanonicalBoardShop,
  resolveCanonicalBoardShopType,
} from "../runtime/canonical-shop-catalog.js";
import {
  createSafariPlayableRuntime,
  purchaseSafariShopItem,
  safariShopPresentation,
  sellSafariShopItem,
} from "../runtime/safari-playable-integration.js";

assert.equal(CANONICAL_SHOP_METADATA.itemCount, 237);
assert.equal(CANONICAL_SHOP_METADATA.boardShopTypeCount, 12);
assert.equal(CANONICAL_SHOP_METADATA.villageShopTypeCount, 7);
assert.equal(CANONICAL_SHOP_METADATA.tmCount, 76);
assert.equal(CANONICAL_SHOP_METADATA.trCount, 24);
assert.deepEqual(CANONICAL_BOARD_SHOP_ORDER, [
  "friendly_shop", "ball_merchant", "evolution_shop", "tm_merchant", "tr_merchant", "mint_merchant",
  "type_boost", "power", "defense", "accuracy", "weather", "switching",
]);
assert.equal(resolveCanonicalBoardShopType(0), "friendly_shop");
assert.equal(resolveCanonicalBoardShopType(49), "friendly_shop");
assert.equal(resolveCanonicalBoardShopType(50), "ball_merchant");
assert.equal(resolveCanonicalBoardShopType(99), "switching");
assert.equal(resolveCanonicalBoardShopType(100), "friendly_shop");

const runtime = createSafariPlayableRuntime();
const boardShops = runtime.variables.mapless.board_events.filter((event) => event.kind === "shop");
assert.ok(boardShops.length >= 1);
assert.ok(boardShops.every((event) => event.canonical_shop && CANONICAL_BOARD_SHOP_ORDER.includes(event.shop_type)));
assert.ok(boardShops.every((event) => event.canonical_shop.stock.length > 0));

const friendly = resolveCanonicalBoardShop("friendly_shop");
const openFriendly = () => {
  runtime.variables.mapless.shop = {
    facility_id: friendly.id,
    board_index: 0,
    canonical: true,
    can_sell: friendly.canSell,
    stock: [...friendly.stock],
    prices: structuredClone(friendly.prices),
    last_transaction_result: null,
  };
};
openFriendly();
runtime.bag.money = 1000;
const beforeBuy = runtime.bag.money;
const buy = purchaseSafariShopItem(runtime, { itemId: "POKEBALL", quantity: 2, confirmed: true });
assert.equal(buy.result, "bought");
assert.equal(runtime.bag.money, beforeBuy - 400);
assert.ok(runtime.bag.slots.some((slot) => slot?.[0] === "POKEBALL" && slot[1] === 2));

openFriendly();
const sellPresentation = safariShopPresentation(runtime);
const sellOption = sellPresentation.items.find((item) => item.id === "SELL:POKEBALL");
assert.ok(sellOption);
assert.equal(sellOption.transaction_kind, "sell");
assert.equal(sellOption.price, 50);
assert.equal(sellOption.quantity, 2);
const beforePlayableSell = runtime.bag.money;
const soldViaPlayableSelection = purchaseSafariShopItem(runtime, { itemId: "SELL:POKEBALL", quantity: 1, confirmed: true });
assert.equal(soldViaPlayableSelection.result, "sold");
assert.equal(soldViaPlayableSelection.transaction_kind, "sell");
assert.equal(runtime.bag.money, beforePlayableSell + 50);
assert.ok(runtime.bag.slots.some((slot) => slot?.[0] === "POKEBALL" && slot[1] === 1));

openFriendly();
const beforeDirectSell = runtime.bag.money;
const sold = sellSafariShopItem(runtime, { itemId: "POKEBALL", quantity: 1 });
assert.equal(sold.result, "sold");
assert.equal(runtime.bag.money, beforeDirectSell + 50);
assert.ok(!runtime.bag.slots.some((slot) => slot?.[0] === "POKEBALL"));

const tm = resolveCanonicalBoardShop("tm_merchant", { sampleIndices: [0,1,2,3,4] });
assert.equal(tm.stock.length, 5);
assert.ok(Object.values(tm.prices).every((row) => row.buyPrice === 3000));
runtime.variables.mapless.shop = {
  facility_id: tm.id,
  board_index: 0,
  canonical: true,
  can_sell: tm.canSell,
  stock: [...tm.stock],
  prices: structuredClone(tm.prices),
  last_transaction_result: null,
};
const presentation = safariShopPresentation(runtime);
assert.equal(presentation.items.length, 5);
assert.ok(presentation.items.every((item) => item.price === 3000 && item.transaction_kind === "buy"));

runtime.bag.slots = [[tm.stock[0], 1]];
const noSellMoney = runtime.bag.money;
const noSell = sellSafariShopItem(runtime, { itemId: tm.stock[0], quantity: 1 });
assert.equal(noSell.result, "unavailable");
assert.equal(runtime.bag.money, noSellMoney);
assert.deepEqual(runtime.bag.slots, [[tm.stock[0], 1]]);

console.log(JSON.stringify({
  ok: true,
  items: CANONICAL_SHOP_METADATA.itemCount,
  boardShopTypes: CANONICAL_SHOP_METADATA.boardShopTypeCount,
  villageShopTypes: CANONICAL_SHOP_METADATA.villageShopTypeCount,
  hydratedBoardShops: boardShops.length,
  buy: buy.result,
  playableSell: soldViaPlayableSelection.result,
  directSell: sold.result,
  blockedSell: noSell.result,
}));
