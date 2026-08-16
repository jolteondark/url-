import { add, buyTransaction, sellTransaction } from './bag-economy-mart-flow.js';
import { resolveItemReceipt } from './bag-economy-item-receipt.js';

function applyPremierBallBonus(input, purchase) {
  const bonus = input?.premierBallBonus;
  if (purchase.result !== 'bought' || !bonus || input.qty < 10 || bonus.premierBallExists === false) {
    return { ...purchase, premierBallBonusRequested: 0, premierBallBonusAdded: 0 };
  }
  let requested = 0;
  if (bonus.moreBonusPremierBalls === true && bonus.purchasedItemIsPokeBall === true) {
    requested = Math.floor(Number(input.qty) / 10);
  } else if (bonus.moreBonusPremierBalls !== true && input.item === 'POKEBALL') {
    requested = 1;
  }
  let addedCount = 0;
  for (let i = 0; i < requested; i += 1) {
    if (!add(purchase.slots, Number(input.maxSlots), Number(input.maxPerSlot), bonus.premierBallItem ?? 'PREMIERBALL', 1)) break;
    addedCount += 1;
  }
  return { ...purchase, premierBallBonusRequested: requested, premierBallBonusAdded: addedCount };
}

export function resolveBagEconomyTransaction(input) {
  const kind = input?.kind;
  if (kind === 'purchase') return { kind, ...applyPremierBallBonus(input, buyTransaction(input)) };
  if (kind === 'sale') return { kind, ...sellTransaction(input) };
  if (['found', 'received', 'prize'].includes(kind)) {
    return { kind, ...resolveItemReceipt(input) };
  }
  throw new RangeError('kind must be purchase, sale, found, received or prize');
}
