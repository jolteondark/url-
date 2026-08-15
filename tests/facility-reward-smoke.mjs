import assert from 'node:assert/strict';
import { resolveFacilityRewardBagMoneyIntegration as resolve } from '../runtime/facility-reward-bag-money-integration.js';

const itemMeta = {
  NUGGET: { valid: true, pocket: 1 },
  POTION: { valid: true, pocket: 1 },
};
const pockets = (slots = [], maxSlots = 2) => ({
  '1': { slots, maxSlots, maxPerSlot: 99 },
});

const chest = resolve({
  facilityInput: {
    source: 'chest',
    return_surface: 'day_board',
    day: 3,
    bag_operations: [{ kind: 'add', item_id: 'NUGGET', quantity: 2 }],
    money_operations: [{ kind: 'gain', amount: 500 }],
  },
  pockets: pockets(),
  itemMeta,
  money: 100,
  maxMoney: 9999999,
});
assert.equal(chest.bagTransactions[0].success, true);
assert.deepEqual(chest.pockets['1'].slots[0], ['NUGGET', 2]);
assert.equal(chest.money, 600);
assert.equal(chest.operations.at(-1).op, 'return_to_facility_surface');
assert.equal(chest.operations.at(-1).surface, 'day_board');

const fullBag = resolve({
  facilityInput: {
    source: 'reward',
    village_id: 'village-1',
    bag_operations: [{ kind: 'add', item_id: 'POTION', quantity: 1 }],
    money_operations: [{ kind: 'add', amount: 500 }],
  },
  pockets: pockets([['NUGGET', 99]], 1),
  itemMeta,
  money: 9999800,
  maxMoney: 9999999,
});
assert.equal(fullBag.bagTransactions[0].success, false);
assert.equal(fullBag.bagTransactions[0].result, 'no_room');
assert.deepEqual(fullBag.pockets['1'].slots[0], ['NUGGET', 99]);
assert.equal(fullBag.money, 9999999);
assert.equal(fullBag.moneyDelta, 199);

assert.throws(() => resolve({
  facilityInput: {
    source: 'shop',
    village_id: 'village-1',
    bag_operations: [{ kind: 'add', item_id: 'POTION', quantity: 1 }],
    money_operations: [{ kind: 'spend', amount: 300 }],
  },
  pockets: pockets(),
  itemMeta,
  money: 500,
}), /existing non-reward economy owner/);

console.log(JSON.stringify({
  chest: { result: chest.bagTransactions[0].result, count: chest.pockets['1'].slots[0][1], money: chest.money },
  fullBag: { result: fullBag.bagTransactions[0].result, money: fullBag.money, moneyDelta: fullBag.moneyDelta },
  shopDelegated: true,
}));
