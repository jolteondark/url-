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

// Facilities/Game Data own stock, conditions, sale eligibility, price and any
// resolved purchase metadata (for example Premier Ball bonus eligibility).
// This owner commits that resolved offer through the existing Bag/Economy
// transaction family so Safari never becomes a parallel mart implementation.
export function resolveResolvedShopTransaction(input = {}) {
  const offer = input.offer || {};
  if (offer.conditionPassed !== true) return unchanged(input, 'unavailable');

  const kind = String(offer.kind || '');
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
  } else if (kind === 'sell') {
    result = resolveBagEconomyTransaction({
      ...transaction,
      kind: 'sale',
      canSell: offer.canSell === true,
    });
  } else {
    return unchanged(input, 'unsupported_transaction');
  }

  return {
    ...result,
    kind,
    item: offer.item ?? null,
    unitPrice: offer.unitPrice,
  };
}
