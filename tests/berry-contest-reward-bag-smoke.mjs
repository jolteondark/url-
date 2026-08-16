import assert from "node:assert/strict";
import { resolveBerryContestRewardBagFlow } from "../runtime/mapless-berry-contest-reward-bag-flow.js";

const itemMeta = {
  ORANBERRY: { valid: true, pocket: "berries" },
  SITRUSBERRY: { valid: true, pocket: "berries" },
  POTION: { valid: true, pocket: "items" },
};

const watched = resolveBerryContestRewardBagFlow({
  action: "watch",
  event: { normal_data: { rating_roll: 0, bulk_roll: 50 } },
  berryPocket: "berries",
  pockets: {
    berries: { slots: [["ORANBERRY", 2]], maxSlots: 10, maxPerSlot: 99 },
    items: { slots: [], maxSlots: 10, maxPerSlot: 99 },
  },
  berry_grades: { ORANBERRY: 0, SITRUSBERRY: 2 },
  itemMeta,
  resolvedBerryRewardItems: [["ORANBERRY"]],
});
assert.equal(watched.result, true);
assert.equal(watched.outcome, "watched");
assert.equal(watched.rewardRequestCount, 1);
assert.equal(watched.rewardTransactions[0].transaction.success, true);
assert.deepEqual(watched.pockets.berries.slots.filter(Boolean), [["ORANBERRY", 3]]);

const winner = resolveBerryContestRewardBagFlow({
  action: "single",
  selected_berry: "SITRUSBERRY",
  event: { normal_data: { rating_roll: 40, bulk_roll: 50 } },
  berryPocket: "berries",
  pockets: {
    berries: { slots: [["SITRUSBERRY", 1]], maxSlots: 10, maxPerSlot: 99 },
    items: { slots: [], maxSlots: 10, maxPerSlot: 99 },
  },
  berry_grades: { SITRUSBERRY: 2, ORANBERRY: 0 },
  itemMeta,
  resolvedBerryRewardItems: [["SITRUSBERRY"]],
  resolvedRandomRewardItems: [["POTION"]],
});
assert.equal(winner.result, true);
assert.equal(winner.outcome, "winner");
assert.equal(winner.rewardRequestCount, 2);
assert.equal(winner.rewardTransactions.length, 2);
assert.equal(winner.rewardTransactions.every((entry) => entry.transaction.success), true);
assert.deepEqual(winner.pockets.berries.slots.filter(Boolean), [["SITRUSBERRY", 1]]);
assert.deepEqual(winner.pockets.items.slots.filter(Boolean), [["POTION", 1]]);

const mismatch = resolveBerryContestRewardBagFlow({
  action: "watch",
  event: { normal_data: {} },
  berryPocket: "berries",
  pockets: { berries: { slots: [], maxSlots: 10, maxPerSlot: 99 } },
  berry_grades: {},
  itemMeta,
  resolvedBerryRewardItems: [[]],
});
assert.equal(mismatch.rewardTransactions.length, 0);
assert.equal(mismatch.rewardOperations[0].op, "reward_resolution_mismatch");

console.log(JSON.stringify({ ok: true, watched: watched.outcome, winner: winner.outcome, mismatch: mismatch.rewardOperations[0].op }));
