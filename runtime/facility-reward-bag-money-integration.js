import { resolveRewardTransaction } from './bag-economy-reward-transaction.js';
import { setMoney } from './bag-economy-mart-flow.js';

const FACILITY_SOURCES = new Set(['village', 'shop', 'inn', 'chest', 'reward', 'bounty']);
const REWARD_SOURCES = new Set(['chest', 'reward', 'bounty', 'village']);
const RETURN_SURFACES = new Set(['village', 'day_board']);
const MONEY_ADD_KINDS = new Set(['add', 'gain', 'reward']);

function integer(value, name) {
  const n = Number(value);
  if (!Number.isInteger(n)) throw new TypeError(`${name} must be an integer`);
  return n;
}

function operationList(value, name) {
  const operations = value ?? [];
  if (!Array.isArray(operations) || operations.some((operation) => !operation || typeof operation !== 'object' || Array.isArray(operation))) {
    throw new Error(`${name} must be a list of operation objects`);
  }
  return operations;
}

function directFacilityState(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('input object is required');
  const source = value.source;
  if (!FACILITY_SOURCES.has(source)) throw new Error('unsupported facility source');
  if (!REWARD_SOURCES.has(source)) throw new Error('facility source belongs to an existing non-reward economy owner');

  const returnSurface = value.return_surface ?? 'village';
  if (!RETURN_SURFACES.has(returnSurface)) throw new Error('unsupported return surface');
  const returnTo = { surface: returnSurface };
  if (returnSurface === 'village') {
    returnTo.village_id = value.village_id ?? null;
  } else {
    const day = value.day;
    if (!Number.isInteger(day) || day < 1) throw new Error('positive day is required when returning to day_board');
    returnTo.day = day;
  }

  return {
    source,
    returnTo,
    bagOperations: operationList(value.bag_operations, 'bag_operations'),
    moneyOperations: operationList(value.money_operations, 'money_operations'),
    stateOperations: operationList(value.state_operations, 'state_operations'),
    saveRequested: Boolean(value.save_requested),
  };
}

export function resolveFacilityRewardBagMoneyIntegration(input = {}) {
  const state = directFacilityState(input.facilityInput ?? {});
  let pockets = structuredClone(input.pockets ?? {});
  const originalMoney = integer(input.money ?? 0, 'money');
  let money = originalMoney;
  const maxMoney = integer(input.maxMoney ?? 9999999, 'maxMoney');
  const bagTransactions = [];
  const moneyCommits = [];
  const operations = [];

  for (const request of state.bagOperations) {
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
  }

  for (const request of state.moneyOperations) {
    if (!MONEY_ADD_KINDS.has(request.kind)) throw new Error('unsupported reward money boundary kind');
    const amount = integer(request.amount ?? 0, 'amount');
    if (amount < 0) throw new Error('reward money amount must be non-negative');
    const before = money;
    money = setMoney(money + amount, maxMoney);
    const commit = { kind: 'add', requested: amount, applied: money - before };
    moneyCommits.push(commit);
    operations.push({ op: 'consume_money_boundary', ...commit });
  }

  operations.push(...state.stateOperations.map((operation) => structuredClone(operation)));
  if (state.saveRequested) operations.push({ op: 'persistence_boundary', request: { kind: 'save' } });
  operations.push({ op: 'return_to_facility_surface', ...state.returnTo });

  const facility = {
    result: 'returned',
    source: state.source,
    return_to: structuredClone(state.returnTo),
  };

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
