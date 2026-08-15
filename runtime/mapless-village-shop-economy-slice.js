import { buyTransaction, sellTransaction, quantity } from './bag-economy-mart-flow.js';
import { resolveVillageFixedShopActionSlice } from './mapless-village-fixed-shop-action-slice.js';

function counts(slots = [], items = []) {
  return Object.fromEntries(items.map((item) => [item, quantity(slots, item)]));
}

export function resolveVillageShopEconomySlice(input = {}) {
  const stock = Array.isArray(input.valid_stock) ? [...input.valid_stock] : [];
  const beforeSlots = (input.slots || []).map((slot) => slot ? [...slot] : null);
  const beforeMoney = Number(input.money ?? 0);
  const beforeStock = counts(beforeSlots, stock);
  const beforeAll = Object.fromEntries(beforeSlots.filter(Boolean).map(([item]) => [item, quantity(beforeSlots, item)]));

  let transaction = { result: 'not_requested', slots: beforeSlots, money: beforeMoney };
  if (input.transaction?.kind === 'buy') {
    transaction = buyTransaction({ ...input.transaction, slots: beforeSlots, money: beforeMoney });
  } else if (input.transaction?.kind === 'sell') {
    transaction = sellTransaction({ ...input.transaction, slots: beforeSlots, money: beforeMoney });
  }

  const afterSlots = transaction.slots ?? beforeSlots;
  const afterMoney = Number(transaction.money ?? beforeMoney);
  const afterStock = counts(afterSlots, stock);
  const allItems = new Set([...Object.keys(beforeAll), ...afterSlots.filter(Boolean).map(([item]) => item)]);
  const afterAll = Object.fromEntries([...allItems].map((item) => [item, quantity(afterSlots, item)]));

  const facility = resolveVillageFixedShopActionSlice({
    facility_id: input.facility_id,
    valid_stock: stock,
    facility_used_up: input.facility_used_up,
    action_available: input.action_available,
    machine_items: input.machine_items,
    before_stock: beforeStock,
    after_stock: afterStock,
    before_all: beforeAll,
    after_all: afterAll,
    before_money: beforeMoney,
    after_money: afterMoney,
    consume_action_success: input.consume_action_success,
    save_available: input.save_available,
  });

  const committed = facility.success;
  return {
    result: committed,
    phase: committed ? 'return_to_village' : 'shop_no_action',
    transaction_result: transaction.result,
    slots: committed ? afterSlots : beforeSlots,
    money: committed ? afterMoney : beforeMoney,
    facility,
  };
}
