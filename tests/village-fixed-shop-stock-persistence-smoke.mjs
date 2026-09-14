import assert from 'node:assert/strict';
import {
  leaveSafariVillageFixedShop,
  openSafariVillageFixedShop,
} from '../runtime/safari-village-fixed-shop-integration.js';

function runtime() {
  return {
    variables: {
      mapless: {
        location: 'village',
        battle: null,
        shop: null,
        village: {
          actions_left: 3,
          fixed_shops: {},
          facility_uses: {},
        },
        last_operations: [],
      },
    },
    bag: { slots: [], money: 999999 },
  };
}

const game = runtime();
const first = openSafariVillageFixedShop(game, 'normal_shop', {
  sampleIndices: Array(12).fill(0),
  heldCategory: 'power',
});
assert.equal(first.result, 'shop_opened');
assert.equal(first.persistenceRequested, true);
assert.ok(first.operations.some((operation) => operation.op === 'request_save' && operation.reason === 'village_fixed_shop_stock'));
const fixedStock = structuredClone(game.variables.mapless.village.fixed_shops.normal_shop);

const returned = leaveSafariVillageFixedShop(game);
assert.equal(returned.result, 'returned');
assert.equal(returned.persistenceRequested, true);
assert.equal(game.variables.mapless.shop, null);
assert.ok(returned.operations.some((operation) => operation.op === 'request_save' && operation.reason === 'village_fixed_shop_return'));

const reopened = openSafariVillageFixedShop(game, 'normal_shop', {
  sampleIndices: Array(12).fill(0xffffffff),
  heldCategory: 'weather',
});
assert.equal(reopened.persistenceRequested, false);
assert.deepEqual(game.variables.mapless.village.fixed_shops.normal_shop, fixedStock);
assert.deepEqual(reopened.shop.stock, fixedStock.stock);
assert.equal(reopened.operations.some((operation) => operation.op === 'request_save'), false);

console.log('village fixed-shop stock persistence smoke: ok');
