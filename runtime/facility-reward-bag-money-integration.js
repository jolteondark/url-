import { resolveFacilityRewardReturn } from './facility-reward-return.js';
import { resolveRewardTransaction } from './bag-economy-reward-transaction.js';
import { setMoney } from './bag-economy-mart-flow.js';

const REWARD_SOURCES = new Set(['chest', 'reward', 'bounty', 'village']);
const MONEY_ADD_KINDS = new Set(['add', 'gain', 'reward']);

function integer(value, name) {
  const n = Number(value);
  if (!Number.isInteger(n)) throw new TypeError(`${name} must be an integer`);
  return n;
}

export function resolveFacilityRewardBagMoneyIntegration(input = {}) {
  const facility = resolveFacilityRewardReturn(input.facilityInput ?? {});
  if (!REWARD_SOURCES.has(facility.source)) {
    throw new Error('facility source belongs to an existing non-reward economy owner');
  }

  let pockets = structuredClone(input.pockets ?? {});
  const originalMoney = integer(input.money ?? 0, 'money');
  let money = originalMoney;
  const maxMoney = integer(input.maxMoney ?? 9999999, 'maxMoney');
  const bagTransactions = [];
  const moneyCommits = [];
  const operations = [];

  for (const operation of facility.operations) {
    if (operation.op === 'bag_boundary') {
      const request = operation.request ?? {};
      if (request.kind !== 'add') throw new Error('unsupported reward bag boundary kind');
      const item = request.item_id ?? request.item;
      const quantity = integer(request.quantity ?? 1, 'quantity');
      if (!item || quantity <= 0) throw new Error('positive reward item quantity is required');
      const tx = resolveRewardTransaction({
        pockets,
        itemMeta: input.itemMeta ?? {},
        items: Array(quantity).fill(item),
      });
      pockets = structuredClone(tx.pockets);
      bagTransactions.push(tx);
      operations.push({
        op: 'consume_bag_boundary',
        kind: 'add',
        item,
        quantity,
        success: tx.success,
        result: tx.result,
      });
    } else if (operation.op === 'money_boundary') {
      const request = operation.request ?? {};
      if (!MONEY_ADD_KINDS.has(request.kind)) throw new Error('unsupported reward money boundary kind');
      const amount = integer(request.amount ?? 0, 'amount');
      if (amount < 0) throw new Error('reward money amount must be non-negative');
      const before = money;
      money = setMoney(money + amount, maxMoney);
      const commit = { kind: 'add', requested: amount, applied: money - before };
      moneyCommits.push(commit);
      operations.push({ op: 'consume_money_boundary', ...commit });
    } else {
      operations.push(structuredClone(operation));
    }
  }

  return {
    facility,
    pockets,
    money,
    moneyDelta: money - originalMoney,
    bagTransactions,
    moneyCommits,
    operations,
  };
}
