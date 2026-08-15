import assert from "node:assert/strict";
import { resolveTreasureBagMoneyIntegration } from "../runtime/mapless-treasure-bag-money-integration.js";

const base = {
  index: 0,
  day: 12,
  board_events: [{ kind: "treasure", chest_tier: "deluxe", chest_seed: 7 }],
  board_visited: [false],
  board_revealed: [false],
  board_consumed: [false],
  confirm: true,
  confirm_choice: 0,
  reward: { tier_name: "豪華な宝箱", items: { POTION: 2 }, money: 500 },
  pockets: { "1": { slots: [], maxSlots: 4, maxPerSlot: 999 } },
  itemMeta: { POTION: { valid: true, pocket: 1 } },
  money: 1000,
  maxMoney: 9999999,
};

const ok = resolveTreasureBagMoneyIntegration(base);
assert.equal(ok.treasure.result, true);
assert.equal(ok.treasure.open_status, "granted");
assert.equal(ok.treasure.state.board_consumed[0], true);
assert.deepEqual(ok.pockets["1"].slots, [["POTION", 2]]);
assert.equal(ok.money, 1500);
assert.equal(ok.moneyDelta, 500);
assert.equal(ok.bagTransaction?.success, true);

const full = resolveTreasureBagMoneyIntegration({
  ...base,
  pockets: { "1": { slots: [["POTION", 999]], maxSlots: 1, maxPerSlot: 999 } },
});
assert.equal(full.treasure.result, false);
assert.equal(full.treasure.open_status, "failed");
assert.equal(full.treasure.state.board_consumed[0], false);
assert.deepEqual(full.pockets["1"].slots, [["POTION", 999]]);
assert.equal(full.money, 1000);
assert.equal(full.moneyDelta, 0);
assert.equal(full.bagTransaction?.result, "no_room");

console.log("PASS treasure Bag/Money smoke");
