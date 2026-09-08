import assert from 'node:assert/strict';
import { resolveResolvedShopTransaction } from '../runtime/bag-economy-resolved-shop-transaction.js';
import { ownerResultRequestsPersistence } from '../runtime/safari-owner-result-persistence.js';

const bought = resolveResolvedShopTransaction({
  offer: { conditionPassed: true, kind: 'buy', item: 'POTION', unitPrice: 100 },
  qty: 1,
  slots: [],
  money: 500,
  maxSlots: 20,
  maxPerSlot: 99,
  maxMoney: 999999,
});
assert.equal(bought.result, 'bought');
assert.equal(bought.persistenceRequested, true);
assert.equal(ownerResultRequestsPersistence(bought), true);

const sold = resolveResolvedShopTransaction({
  offer: { conditionPassed: true, kind: 'sell', item: 'POTION', unitPrice: 50, canSell: true },
  qty: 1,
  slots: [['POTION', 1]],
  money: 0,
  maxSlots: 20,
  maxPerSlot: 99,
  maxMoney: 999999,
});
assert.equal(sold.result, 'sold');
assert.equal(sold.persistenceRequested, true);
assert.equal(ownerResultRequestsPersistence(sold), true);

const unavailable = resolveResolvedShopTransaction({
  offer: { conditionPassed: false, kind: 'buy', item: 'POTION', unitPrice: 100 },
  qty: 1,
  slots: [],
  money: 500,
  maxSlots: 20,
  maxPerSlot: 99,
  maxMoney: 999999,
});
assert.equal(unavailable.result, 'unavailable');
assert.equal(unavailable.persistenceRequested, false);
assert.equal(ownerResultRequestsPersistence(unavailable), false);

console.log('resolved shop owner persistence smoke: ok');
