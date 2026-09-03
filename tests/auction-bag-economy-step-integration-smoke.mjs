import assert from "node:assert/strict";
import { resolveAuctionBagEconomyStep } from "../runtime/bag-economy-auction-step-integration.js";

function product(overrides = {}) {
  return {
    item:"NUGGET",
    fake:false,
    price:1000,
    npc_limits:[],
    npc_active:[],
    ...overrides,
  };
}

const common = {
  slots:[],
  money:2000,
  maxSlots:2,
  maxPerSlot:99,
  maxMoney:9999999,
};

{
  const result = resolveAuctionBagEconomyStep(product(), { ...common, choice:0 });
  assert.equal(result.result, "purchased");
  assert.equal(result.awaiting_choice, false);
  assert.equal(result.won, true);
  assert.equal(result.spent, 1100);
  assert.equal(result.money, 900);
  assert.deepEqual(result.slots, [["NUGGET", 1]]);
  assert.deepEqual(result.granted_items, ["NUGGET"]);
}

{
  const result = resolveAuctionBagEconomyStep(product({ fake:true }), { ...common, choice:0 });
  assert.equal(result.result, "fake_won");
  assert.equal(result.won, true);
  assert.equal(result.spent, 1100);
  assert.equal(result.money, 900);
  assert.deepEqual(result.slots, []);
  assert.deepEqual(result.granted_items, []);
}

{
  const result = resolveAuctionBagEconomyStep(product(), {
    ...common,
    slots:[["POTION", 99]],
    maxSlots:1,
    choice:0,
  });
  assert.equal(result.result, "finished_without_purchase");
  assert.equal(result.won, false);
  assert.equal(result.spent, 0);
  assert.equal(result.money, 2000);
  assert.deepEqual(result.slots, [["POTION", 99]]);
  assert.ok(result.facility.operations.some((op) => op.op === "refund_money" && op.amount === 1100));
}

{
  const result = resolveAuctionBagEconomyStep(product(), { ...common, money:1000, choice:0 });
  assert.equal(result.result, "awaiting_choice");
  assert.equal(result.awaiting_choice, true);
  assert.equal(result.money, 1000);
  assert.deepEqual(result.slots, []);
  assert.ok(result.facility.operations.some((op) => op.op === "message"));
}

{
  const result = resolveAuctionBagEconomyStep(product(), { ...common, choice:2 });
  assert.equal(result.result, "finished_without_purchase");
  assert.equal(result.awaiting_choice, false);
  assert.equal(result.won, false);
  assert.equal(result.money, 2000);
  assert.deepEqual(result.slots, []);
}

{
  const result = resolveAuctionBagEconomyStep(product({ npc_limits:[2000], npc_active:[true] }), { ...common, choice:0 });
  assert.equal(result.result, "awaiting_choice");
  assert.equal(result.awaiting_choice, true);
  assert.equal(result.product.price, 1210);
  assert.equal(result.money, 2000);
  assert.deepEqual(result.slots, []);
}

console.log("auction Bag/Economy step integration smoke: ok");
