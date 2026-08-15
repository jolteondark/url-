import assert from 'node:assert/strict';
import { resolveResolvedShopTransaction } from '../runtime/bag-economy-resolved-shop-transaction.js';

const common = { maxSlots: 2, maxPerSlot: 10, maxMoney: 999999 };

const unavailable = resolveResolvedShopTransaction({
  ...common, slots: [['POTION', 1]], money: 1000,
  offer: { kind: 'buy', item: 'POTION', conditionPassed: false }, qty: 2,
});
assert.equal(unavailable.result, 'unavailable');
assert.deepEqual(unavailable.slots, [['POTION', 1]]);
assert.equal(unavailable.money, 1000);

const bought = resolveResolvedShopTransaction({
  ...common, slots: [], money: 1000,
  offer: { kind: 'buy', item: 'POTION', conditionPassed: true, unitPrice: 137 }, qty: 2,
});
assert.equal(bought.result, 'bought');
assert.deepEqual(bought.slots.filter(Boolean), [['POTION', 2]]);
assert.equal(bought.money, 726);
assert.equal(bought.spent, 274);

const sold = resolveResolvedShopTransaction({
  ...common, slots: [['POTION', 3]], money: 1000,
  offer: { kind: 'sell', item: 'POTION', conditionPassed: true, unitPrice: 61 }, qty: 2,
});
assert.equal(sold.result, 'sold');
assert.deepEqual(sold.slots.filter(Boolean), [['POTION', 1]]);
assert.equal(sold.money, 1122);
assert.equal(sold.earned, 122);

console.log(JSON.stringify({ ok: true, unavailable: unavailable.result, bought: bought.result, sold: sold.result }));
