import { buyTransaction, sellTransaction } from './bag-economy-mart-flow.js';

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

// Facilities/Game Data own stock, conditions, sale eligibility and price
// resolution. This owner only commits an already-resolved offer through the
// canonical Bag/Money mart owners.
export function resolveResolvedShopTransaction(input = {}) {
  const offer = input.offer || {};
  if (offer.conditionPassed !== true) return unchanged(input, 'unavailable');

  const kind = String(offer.kind || '');
  const transaction = {
    ...offer,
    qty: input.qty ?? offer.qty,
    slots: input.slots || [],
    money: input.money ?? 0,
  };

  let result;
  if (kind === 'buy') {
    result = buyTransaction({
      ...transaction,
      maxSlots: input.maxSlots,
      maxPerSlot: input.maxPerSlot,
      maxMoney: input.maxMoney,
    });
  } else if (kind === 'sell') {
    result = sellTransaction({
      ...transaction,
      canSell: offer.canSell === true,
      maxMoney: input.maxMoney,
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
