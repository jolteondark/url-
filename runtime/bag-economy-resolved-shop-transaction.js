import { resolveBagEconomyTransaction } from './bag-economy-transaction-family.js';

function cloneSlots(slots = []) {
  return slots.map((slot) => slot ? [...slot] : null);
}

function unchanged(input, result) {
  return {
    result,
    kind: String(input.offer?.kind || ''),
    item: input.offer?.item ?? null,
    unitPrice: input.offer?.unitPrice ?? null,
    slots: cloneSlots(input.slots || []),
    money: Number(input.money ?? 0),
  };
}

function hasResolvedItemAndPrice(offer) {
  const item = offer?.item;
  const unitPrice = Number(offer?.unitPrice);
  return typeof item === 'string' && item.length > 0 && Number.isInteger(unitPrice) && unitPrice >= 0;
}

// Facilities/Game Data own stock, conditions, sale eligibility, price and any
// resolved purchase metadata (for example Premier Ball bonus eligibility).
// This owner commits only a complete resolved offer through the existing
// Bag/Economy transaction family so Safari never becomes a parallel mart
// implementation and unresolved data cannot mutate Bag or Money.
export function resolveResolvedShopTransaction(input = {}) {
  const offer = input.offer || {};
  if (offer.conditionPassed !== true) return unchanged(input, 'unavailable');

  const kind = String(offer.kind || '');
  if (!['buy', 'sell'].includes(kind)) return unchanged(input, 'unsupported_transaction');
  if (!hasResolvedItemAndPrice(offer)) return unchanged(input, 'unresolved_offer');

  const transaction = {
    ...offer,
    qty: input.qty ?? offer.qty,
    slots: input.slots || [],
    money: input.money ?? 0,
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
