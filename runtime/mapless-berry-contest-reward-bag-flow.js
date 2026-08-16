import { resolveBerryContestWithBag } from './mapless-berry-contest-bag-flow.js';
import { resolveRewardTransaction } from './bag-economy-reward-transaction.js';

const clone = (value) => structuredClone(value ?? {});

function rewardRequests(eventResolution) {
  return (eventResolution?.operations || []).filter((operation) =>
    operation.op === 'reward_berry_grade' || operation.op === 'grant_random'
  );
}

function resolvedItemsFor(operation, input, indexes) {
  if (operation.op === 'reward_berry_grade') {
    return clone((input.resolvedBerryRewardItems || [])[indexes.berry++] || []);
  }
  return clone((input.resolvedRandomRewardItems || [])[indexes.random++] || []);
}

function expectedCount(operation) {
  return Number(operation.op === 'reward_berry_grade' ? operation.count ?? 1 : operation.quantity ?? operation.count ?? 1);
}

export function resolveBerryContestRewardBagFlow(input = {}) {
  let pockets = clone(input.pockets || {});
  const berryPocketKey = String(input.berryPocket ?? '');
  const berryPocket = pockets[berryPocketKey];
  if (!berryPocket) throw new Error('berry_contest_berry_pocket_missing');

  const originalBerrySlots = clone(berryPocket.slots || []);
  const contest = resolveBerryContestWithBag({ ...input, slots: originalBerrySlots });
  pockets[berryPocketKey].slots = clone(contest.slots);

  const requests = rewardRequests(contest.event_resolution);
  const indexes = { berry: 0, random: 0 };
  const rewardTransactions = [];
  const rewardOperations = [];
  let randomRewardResult = input.random_reward_result;

  for (const operation of requests) {
    const items = resolvedItemsFor(operation, input, indexes);
    const expected = expectedCount(operation);
    if (items.length !== expected) {
      rewardOperations.push({
        op: 'reward_resolution_mismatch',
        request: operation.op,
        expected,
        actual: items.length,
      });
      if (operation.op === 'grant_random') randomRewardResult = false;
      continue;
    }
    const transaction = resolveRewardTransaction({
      pockets,
      itemMeta: input.itemMeta || {},
      items,
    });
    pockets = clone(transaction.pockets);
    rewardTransactions.push({ request: clone(operation), transaction });
    rewardOperations.push({
      op: operation.op === 'reward_berry_grade' ? 'consume_reward_berry_grade' : 'consume_grant_random',
      success: transaction.success === true,
      result: transaction.result,
      items,
    });
    if (operation.op === 'grant_random') randomRewardResult = transaction.success === true;
  }

  const reflected = resolveBerryContestWithBag({
    ...input,
    slots: originalBerrySlots,
    random_reward_result: randomRewardResult,
  });

  return {
    ...contest,
    event_resolution: reflected.event_resolution,
    pockets,
    rewardTransactions,
    rewardOperations,
    rewardRequestCount: requests.length,
  };
}
