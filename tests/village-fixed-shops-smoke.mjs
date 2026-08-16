import assert from 'node:assert/strict';
import { createSafariPlayableRuntime, enterSafariVillage } from '../runtime/safari-playable-integration.js';
import { resolveResolvedShopTransaction } from '../runtime/bag-economy-resolved-shop-transaction.js';
import {
  SAFARI_VILLAGE_FIXED_SHOP_IDS,
  leaveSafariVillageFixedShop,
  openSafariVillageFixedShop,
  purchaseSafariVillageFixedShopItem,
} from '../runtime/safari-village-fixed-shop-integration.js';

const expectedCounts = {
  normal_shop: 12,
  ball_shop: 5,
  held_shop: 12,
  tm_shop: 5,
  tr_shop: 5,
  evolution_shop: 11,
  mint_shop: 12,
};

for (const id of SAFARI_VILLAGE_FIXED_SHOP_IDS) {
  const runtime = createSafariPlayableRuntime();
  enterSafariVillage(runtime);
  const opened = openSafariVillageFixedShop(runtime, id, {
    sampleIndices: Array.from({ length: 12 }, (_, index) => index),
    heldCategory: 'type_boost',
  });
  assert.equal(opened.result, 'shop_opened');
  assert.equal(runtime.variables.mapless.shop.facility_id, id);
  assert.equal(runtime.variables.mapless.shop.return_target, 'village');
  assert.equal(runtime.variables.mapless.shop.stock.length, expectedCounts[id]);
  const left = leaveSafariVillageFixedShop(runtime);
  assert.equal(left.result, 'returned');
  assert.equal(runtime.variables.mapless.location, 'village');
  assert.equal(runtime.variables.mapless.village.actions_left, 3);
}

const runtime = createSafariPlayableRuntime();
enterSafariVillage(runtime);
runtime.bag.money = 10000;
openSafariVillageFixedShop(runtime, 'normal_shop', {
  sampleIndices: Array.from({ length: 12 }, (_, index) => index),
});
assert.equal(runtime.variables.mapless.shop.stock[0], 'POKEBALL');
const bought = purchaseSafariVillageFixedShopItem(runtime, { itemId: 'POKEBALL', quantity: 1 });
assert.equal(bought.result, true);
assert.equal(bought.transaction_result, 'bought');
assert.equal(runtime.bag.slots.some((slot) => slot?.[0] === 'POKEBALL' && slot[1] === 1), true);
assert.equal(runtime.bag.money, 9800);
assert.equal(runtime.variables.mapless.village.actions_left, 2);
assert.equal(runtime.variables.mapless.village.facility_uses.normal_shop, 1);
assert.equal(runtime.variables.mapless.shop, null);
assert.equal(bought.persistenceRequested, true);

openSafariVillageFixedShop(runtime, 'normal_shop');
const blocked = purchaseSafariVillageFixedShopItem(runtime, { itemId: 'POKEBALL', quantity: 1 });
assert.equal(blocked.result, false);
assert.equal(blocked.transaction_result, 'facility_unavailable');
assert.equal(runtime.bag.money, 9800);
assert.equal(runtime.variables.mapless.village.actions_left, 2);
leaveSafariVillageFixedShop(runtime);

const unresolved = resolveResolvedShopTransaction({
  offer: { kind: 'buy', item: 'POKEBALL', conditionPassed: true },
  qty: 1,
  slots: [['POTION', 1]],
  money: 1000,
  maxSlots: 20,
  maxPerSlot: 99,
  maxMoney: 999999,
});
assert.equal(unresolved.result, 'unresolved_offer');
assert.deepEqual(unresolved.slots, [['POTION', 1]]);
assert.equal(unresolved.money, 1000);

console.log('PASS village fixed shops 7/7 + transaction lifecycle + M0377 fail-closed');
