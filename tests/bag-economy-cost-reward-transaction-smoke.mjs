import assert from 'node:assert/strict';
import { resolveRewardTransaction } from '../runtime/bag-economy-reward-transaction.js';

const itemMeta = {
  ORANBERRY: { valid: true, pocket: 1 },
  PECHABERRY: { valid: true, pocket: 1 },
  HONEY: { valid: true, pocket: 1 },
};

function pockets(slots, maxSlots = 2, maxPerSlot = 99) {
  return { '1': { slots, maxSlots, maxPerSlot } };
}

{
  const result = resolveRewardTransaction({
    pockets: pockets([['ORANBERRY', 1]], 1, 99),
    itemMeta,
    costs: [{ item: 'ORANBERRY', quantity: 1 }],
    items: ['HONEY'],
  });
  assert.equal(result.success, true);
  assert.equal(result.result, 'granted');
  assert.deepEqual(result.consumed, [{ item: 'ORANBERRY', quantity: 1 }]);
  assert.deepEqual(result.granted, [{ item: 'HONEY', quantity: 1 }]);
  assert.deepEqual(result.pockets['1'].slots, [['HONEY', 1]]);
}

{
  const original = pockets([['ORANBERRY', 2]], 1, 2);
  const result = resolveRewardTransaction({
    pockets: original,
    itemMeta,
    costs: [{ item: 'ORANBERRY', quantity: 1 }],
    items: ['HONEY'],
  });
  assert.equal(result.success, false);
  assert.equal(result.result, 'no_room');
  assert.deepEqual(result.consumed, []);
  assert.deepEqual(result.granted, []);
  assert.deepEqual(result.pockets, original);
}

{
  const original = pockets([['ORANBERRY', 1], null], 2, 99);
  const result = resolveRewardTransaction({
    pockets: original,
    itemMeta,
    costs: [{ item: 'ORANBERRY', quantity: 2 }],
    items: ['HONEY'],
  });
  assert.equal(result.success, false);
  assert.equal(result.result, 'not_enough_items');
  assert.deepEqual(result.pockets, original);
}

{
  const result = resolveRewardTransaction({
    pockets: pockets([['ORANBERRY', 2], ['PECHABERRY', 2]], 3, 99),
    itemMeta,
    costs: [
      { item: 'ORANBERRY', quantity: 1 },
      { item: 'PECHABERRY', quantity: 2 },
      { item: 'ORANBERRY', quantity: 1 },
    ],
    items: ['HONEY'],
  });
  assert.equal(result.success, true);
  assert.deepEqual(result.consumed, [
    { item: 'ORANBERRY', quantity: 2 },
    { item: 'PECHABERRY', quantity: 2 },
  ]);
  assert.deepEqual(result.pockets['1'].slots, [['HONEY', 1]]);
}

{
  const original = pockets([['ORANBERRY', 1]], 1, 99);
  const result = resolveRewardTransaction({
    pockets: original,
    itemMeta,
    costs: [{ item: 'ORANBERRY', quantity: 1 }],
    items: ['NOT_A_REAL_ITEM'],
  });
  assert.equal(result.success, false);
  assert.equal(result.result, 'empty');
  assert.deepEqual(result.pockets, original);
}

console.log('bag-economy cost+reward atomic smoke: ok');
