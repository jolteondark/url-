import assert from "node:assert/strict";
import { resolveResolvedShopTransaction } from "../runtime/bag-economy-resolved-shop-transaction.js";

const common = { maxSlots: 3, maxPerSlot: 99, maxMoney: 999999 };

const premier = resolveResolvedShopTransaction({
  ...common,
  slots: [],
  money: 5000,
  offer: {
    kind: "buy",
    item: "POKEBALL",
    conditionPassed: true,
    unitPrice: 100,
    premierBallBonus: {
      moreBonusPremierBalls: true,
      purchasedItemIsPokeBall: true,
      premierBallExists: true,
    },
  },
  qty: 20,
});
assert.equal(premier.result, "bought");
assert.deepEqual(premier.slots.filter(Boolean), [["POKEBALL", 20], ["PREMIERBALL", 2]]);
assert.equal(premier.money, 3000);
assert.equal(premier.premierBallBonusRequested, 2);
assert.equal(premier.premierBallBonusAdded, 2);

const sold = resolveResolvedShopTransaction({
  ...common,
  slots: [["POTION", 3]],
  money: 1000,
  offer: { kind: "sell", item: "POTION", conditionPassed: true, canSell: true, unitPrice: 61 },
  qty: 2,
});
assert.equal(sold.result, "sold");
assert.deepEqual(sold.slots.filter(Boolean), [["POTION", 1]]);
assert.equal(sold.money, 1122);

const blocked = resolveResolvedShopTransaction({
  ...common,
  slots: [["POTION", 1]],
  money: 1000,
  offer: { kind: "sell", item: "POTION", conditionPassed: true, unitPrice: 61 },
  qty: 1,
});
assert.equal(blocked.result, "cannot_sell");
assert.deepEqual(blocked.slots.filter(Boolean), [["POTION", 1]]);
assert.equal(blocked.money, 1000);

console.log(JSON.stringify({ ok: true, premier: [premier.premierBallBonusRequested, premier.premierBallBonusAdded], sale: sold.result, blocked: blocked.result }));
