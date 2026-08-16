import { resolveBagEconomyTransaction } from './bag-economy-transaction-family.js';

function cloneSlots(slots = []) {
  if (!Array.isArray(slots)) return [];
  return slots.map((slot) => Array.isArray(slot) ? [...slot] : slot);
}

function unchanged(input, result) {
  return {
    result,
    kind: String(input.offer?.kind || ''),
    item: input.offer?.item ?? null,
    unitPrice: input.offer?.unitPrice ?? null,
    slots: cloneSlots(input.slots),
    money: Number.isInteger(input.money) ? input.money : Number(input.money ?? 0),
  };
}

function hasResolvedItemAndPrice(offer) {
  const item = offer?.item;
  const unitPrice = offer?.unitPrice;
  return typeof item === 'string' && item.length > 0 && Number.isInteger(unitPrice) && unitPrice >= 0;
}

function hasResolvedSlots(slots) {
  return Array.isArray(slots) && slots.every((slot) => {
    if (slot == null) return true;
    return Array.isArray(slot)
      && slot.length >= 2
      && typeof slot[0] === 'string'
      && slot[0].length > 0
      && Number.isInteger(slot[1])
      && slot[1] > 0;
  });
}

function hasResolvedTransactionContext(input, offer, kind) {
  const qty = input.qty ?? offer.qty;
  if (!Number.isInteger(qty)) return false;
  if (!Number.isInteger(input.money)) return false;
  if (!Number.isInteger(input.maxMoney) || input.maxMoney < 0) return false;
  if (!hasResolvedSlots(input.slots)) return false;
  if (kind === 'buy') {
    if (!Number.isInteger(input.maxSlots) || input.maxSlots < 0) return false;
    if (!Number.isInteger(input.maxPerSlot) || input.maxPerSlot <= 0) return false;
  }
  return true;
}

// Facilities/Game Data own stock, conditions, sale eligibility, price and any
// resolved purchase metadata (for example Premier Ball bonus eligibility).
// This owner commits only a complete resolved offer and complete Bag/Money
// transaction context through the existing Bag/Economy transaction family so
// Safari never becomes a parallel mart implementation and unresolved data
// cannot mutate Bag/Money or crash the browser boundary.
export function resolveResolvedShopTransaction(input = {}) {
  const offer = input.offer || {};
  if (offer.conditionPassed !== true) return unchanged(input, 'unavailable');

  const kind = String(offer.kind || '');
  if (!['buy', 'sell'].includes(kind)) return unchanged(input, 'unsupported_transaction');
  if (!hasResolvedItemAndPrice(offer)) return unchanged(input, 'unresolved_offer');
  if (!hasResolvedTransactionContext(input, offer, kind)) return unchanged(input, 'unresolved_transaction');

  const transaction = {
    ...offer,
    qty: input.qty ?? offer.qty,
    slots: input.slots,
    money: input.money,
    maxSlots: input.maxSlots,
    maxPerSlot: input.maxPerSlot,
    maxMoney: input.maxMoney,
  };

  let result;
  if (kind === 'buy') {
    result = resolveBagEconomyTransaction({ ...transaction, kind: 'purchase' });
  } else {
    result = resolveBagEconomyTransaction({
      ...transaction,
      kind: 'sale',
      canSell: offer.canSell === true,
    });
  }

  return {
    ...result,
    kind,
    item: offer.item,
    unitPrice: offer.unitPrice,
  };
}
