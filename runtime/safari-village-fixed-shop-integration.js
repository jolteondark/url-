import { quantity } from './bag-economy-mart-flow.js';
import { resolveResolvedShopTransaction } from './bag-economy-resolved-shop-transaction.js';
import {
  canonicalResolvedShopOffer,
  resolveCanonicalVillageShop,
} from './canonical-shop-catalog.js';
import { resolveVillageFixedShopActionSlice } from './mapless-village-fixed-shop-action-slice.js';

export const SAFARI_VILLAGE_FIXED_SHOP_IDS = Object.freeze([
  'normal_shop',
  'ball_shop',
  'held_shop',
  'tm_shop',
  'tr_shop',
  'evolution_shop',
  'mint_shop',
]);

const HELD_CATEGORIES = Object.freeze([
  'type_boost',
  'power',
  'defense',
  'accuracy',
  'weather',
  'switching',
]);

function stateOf(runtime) {
  const state = runtime?.variables?.mapless;
  if (!state || typeof state !== 'object' || Array.isArray(state)) throw new TypeError('runtime variables.mapless state is required');
  return state;
}

function villageOf(runtime) {
  const state = stateOf(runtime);
  const village = state.village;
  if (!village || typeof village !== 'object' || Array.isArray(village)) throw new TypeError('village state is required');
  if (!village.fixed_shops || typeof village.fixed_shops !== 'object' || Array.isArray(village.fixed_shops)) village.fixed_shops = {};
  if (!village.facility_uses || typeof village.facility_uses !== 'object' || Array.isArray(village.facility_uses)) village.facility_uses = {};
  return village;
}

function randomUint32() {
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    const value = new Uint32Array(1);
    globalThis.crypto.getRandomValues(value);
    return value[0] >>> 0;
  }
  return Math.floor(Math.random() * 0x100000000) >>> 0;
}

function randomIndex(length) {
  if (!Number.isInteger(length) || length < 1) throw new RangeError('random length must be positive');
  return randomUint32() % length;
}

function snapshotShop(shop) {
  return {
    id: shop.id,
    surface: shop.surface,
    poolId: shop.poolId ?? null,
    canSell: Boolean(shop.canSell),
    stock: [...shop.stock],
    prices: Object.fromEntries(Object.entries(shop.prices).map(([id, price]) => [id, { ...price }])),
  };
}

function resolvedVillageShop(village, facilityId, input = {}) {
  if (village.fixed_shops[facilityId]) return village.fixed_shops[facilityId];
  const sampleIndices = Array.isArray(input.sampleIndices)
    ? [...input.sampleIndices]
    : Array.from({ length: 12 }, () => randomUint32());
  const heldCategory = input.heldCategory ?? HELD_CATEGORIES[randomIndex(HELD_CATEGORIES.length)];
  const resolved = resolveCanonicalVillageShop(facilityId, { sampleIndices, heldCategory });
  const snapshot = snapshotShop(resolved);
  village.fixed_shops[facilityId] = snapshot;
  return snapshot;
}

function counts(slots, items) {
  return Object.fromEntries(items.map((item) => [item, quantity(slots, item)]));
}

function allCounts(slots) {
  const items = [...new Set((slots ?? []).filter(Boolean).map(([item]) => item))];
  return Object.fromEntries(items.map((item) => [item, quantity(slots, item)]));
}

function machineItems(stock) {
  return Object.fromEntries(stock.filter((item) => /^TM\d+$/.test(item)).map((item) => [item, true]));
}

function fixedShopPreflight(runtime, shop) {
  const village = villageOf(runtime);
  const beforeStock = counts(runtime.bag.slots, shop.stock);
  const beforeAll = allCounts(runtime.bag.slots);
  const beforeMoney = Number(runtime.bag.money ?? 0);
  return resolveVillageFixedShopActionSlice({
    facility_id: shop.id,
    valid_stock: shop.stock,
    facility_used_up: Number(village.facility_uses[shop.id] ?? 0) >= 1,
    action_available: Number(village.actions_left ?? 0) > 0,
    machine_items: machineItems(shop.stock),
    before_stock: beforeStock,
    after_stock: beforeStock,
    before_all: beforeAll,
    after_all: beforeAll,
    before_money: beforeMoney,
    after_money: beforeMoney,
    consume_action_success: true,
    save_available: true,
  });
}

export function openSafariVillageFixedShop(runtime, facilityId, input = {}) {
  const state = stateOf(runtime);
  if (state.location !== 'village') throw new Error('village location is required');
  if (state.battle) throw new Error('active battle must be completed first');
  if (state.shop) throw new Error('another shop is already open');
  const id = String(facilityId ?? '');
  if (!SAFARI_VILLAGE_FIXED_SHOP_IDS.includes(id)) throw new RangeError(`unknown village fixed shop: ${facilityId}`);
  const village = villageOf(runtime);
  const shop = resolvedVillageShop(village, id, input);
  const preflight = fixedShopPreflight(runtime, shop);
  state.shop = {
    facility_id: shop.id,
    board_index: null,
    canonical: true,
    can_sell: shop.canSell,
    stock: [...shop.stock],
    prices: structuredClone(shop.prices),
    last_transaction_result: null,
    return_target: 'village',
    village_fixed_shop: true,
  };
  state.last_operations = preflight.operations;
  const used = Number(village.facility_uses[id] ?? 0) >= 1;
  const noActions = Number(village.actions_left ?? 0) <= 0;
  state.notice = used
    ? 'この村ではすでに利用しました。商品は確認できます。'
    : noActions
      ? '行動が残っていないため、商品確認のみできます。'
      : `${id}の商品を選んでください。購入または売却が成立すると村の行動を1消費します。`;
  return { runtime, result: 'shop_opened', shop: structuredClone(state.shop), operations: preflight.operations };
}

export function purchaseSafariVillageFixedShopItem(runtime, input = {}) {
  const state = stateOf(runtime);
  const active = state.shop;
  if (!active?.village_fixed_shop || active.return_target !== 'village') throw new Error('active village fixed shop is required');
  const village = villageOf(runtime);
  const shop = village.fixed_shops[active.facility_id];
  if (!shop) throw new Error('resolved village fixed shop snapshot is required');

  const preflight = fixedShopPreflight(runtime, shop);
  if (!preflight.operations.some((operation) => operation.op === 'request_open_fixed_shop')) {
    state.last_operations = preflight.operations;
    state.notice = Number(village.facility_uses[shop.id] ?? 0) >= 1
      ? 'この村ではすでに利用しました。'
      : '村で利用できる行動が残っていません。';
    return { runtime, result: false, transaction_result: 'facility_unavailable', operations: preflight.operations, persistenceRequested: false };
  }

  const selected = String(input.itemId ?? '');
  const sell = selected.startsWith('SELL:');
  const itemId = sell ? selected.slice(5) : selected;
  if (!shop.stock.includes(itemId)) throw new RangeError('selected item is outside the active village shop stock');
  const requestedQuantity = Number(input.quantity);
  if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) throw new RangeError('shop quantity must be a positive integer');

  const beforeSlots = structuredClone(runtime.bag.slots);
  const beforeMoney = Number(runtime.bag.money ?? 0);
  const offer = canonicalResolvedShopOffer(shop, itemId, sell ? 'sell' : 'buy');
  const transaction = resolveResolvedShopTransaction({
    offer,
    qty: requestedQuantity,
    slots: beforeSlots,
    money: beforeMoney,
    maxSlots: 20,
    maxPerSlot: 99,
    maxMoney: 999999,
  });
  const afterSlots = structuredClone(transaction.slots ?? beforeSlots);
  const afterMoney = Number(transaction.money ?? beforeMoney);
  const facility = resolveVillageFixedShopActionSlice({
    facility_id: shop.id,
    valid_stock: shop.stock,
    facility_used_up: false,
    action_available: true,
    machine_items: machineItems(shop.stock),
    before_stock: counts(beforeSlots, shop.stock),
    after_stock: counts(afterSlots, shop.stock),
    before_all: allCounts(beforeSlots),
    after_all: allCounts(afterSlots),
    before_money: beforeMoney,
    after_money: afterMoney,
    consume_action_success: true,
    save_available: true,
  });

  active.last_transaction_result = transaction.result;
  if (!facility.success) {
    state.last_operations = facility.operations;
    state.notice = transaction.result === 'not_enough_money'
      ? '所持金が足りません。'
      : transaction.result === 'no_room'
        ? 'バッグに空きがありません。'
        : transaction.result === 'unavailable'
          ? 'この店ではその取引を利用できません。'
          : `取引は成立しませんでした（${transaction.result}）。`;
    return { runtime, result: false, transaction_result: transaction.result, transaction, facility, operations: facility.operations, persistenceRequested: false };
  }

  runtime.bag.slots = afterSlots;
  runtime.bag.money = afterMoney;
  village.actions_left = Math.max(0, Number(village.actions_left ?? 0) - 1);
  village.facility_uses[shop.id] = Number(village.facility_uses[shop.id] ?? 0) + Number(facility.use_count ?? 1);
  state.shop = null;
  state.last_operations = [
    { op: 'canonical_village_shop_transaction', facility_id: shop.id, kind: sell ? 'sell' : 'buy', item: itemId, quantity: requestedQuantity, result: transaction.result },
    ...facility.operations,
  ];
  state.notice = transaction.result === 'sold'
    ? `${itemId}を${requestedQuantity}個売却しました。村へ戻りました。`
    : `${itemId}を${requestedQuantity}個購入しました。村へ戻りました。`;
  return {
    runtime,
    result: true,
    transaction_result: transaction.result,
    transaction,
    facility,
    operations: state.last_operations,
    persistenceRequested: facility.operations.some((operation) => operation.op === 'request_save'),
  };
}

export function leaveSafariVillageFixedShop(runtime) {
  const state = stateOf(runtime);
  if (!state.shop?.village_fixed_shop || state.shop.return_target !== 'village') throw new Error('active village fixed shop is required');
  const facilityId = state.shop.facility_id;
  state.shop = null;
  state.notice = '買い物をせず村へ戻りました。';
  state.last_operations = [{ op: 'return_to_village', from: facilityId }];
  return { runtime, result: 'returned', operations: state.last_operations };
}
