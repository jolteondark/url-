import assert from "node:assert/strict";
import { safariShopPresentation } from "../runtime/safari-shop-display-presentation.js";

const runtime = {
  variables: {
    mapless: {
      shop: {
        facility_id: "held_shop",
        board_index: null,
        canonical: true,
        can_sell: true,
        stock: ["LEFTOVERS", "TM01"],
        prices: {
          LEFTOVERS: { buyPrice: 4800, sellPrice: 1200 },
          TM01: { buyPrice: 3000, sellPrice: 750 },
        },
        last_transaction_result: null,
      },
    },
  },
  bag: {
    money: 9000,
    slots: [["LEFTOVERS", 2]],
  },
};

const shop = safariShopPresentation(runtime);
assert.equal(shop.facilityId, "held_shop");
assert.equal(shop.money, 9000);
assert.deepEqual(shop.items.map((item) => item.id), ["LEFTOVERS", "TM01"]);
assert.equal(shop.items[0].label, "Leftovers");
assert.equal(shop.items[0].price, 4800);
assert.equal(shop.items[0].sell_price, 1200);
assert.equal(shop.items[0].quantity, 2);
assert.equal(shop.items[1].label, "TR01");
assert.equal(shop.items[1].machineKind, "TR");
assert.equal(shop.items[1].moveId, "FOCUSPUNCH");

console.log("Safari canonical fixed shop display smoke passed");
