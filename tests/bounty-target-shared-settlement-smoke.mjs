import assert from "node:assert/strict";
import fs from "node:fs";
import { commitSafariBagEconomyReceipt } from "../runtime/safari-bag-economy-receipt.js";

const source = fs.readFileSync(new URL("../runtime/safari-bounty-target-interaction.js", import.meta.url), "utf8");
assert.match(source, /commitSafariBagEconomyReceipt/);
assert.doesNotMatch(source, /function addMoney/);
assert.doesNotMatch(source, /applySafariLargeItemReward/);
assert.match(source, /receipt\?\.operations/);

const blockedRuntime = { bag:{ slots:[["POTION", 1]], money:500 } };
const blocked = commitSafariBagEconomyReceipt(blockedRuntime, {
  reward:{ success:false, result:"no_room", operations:[{ op:"preflight_can_add", result:false }] },
  money:300,
});
assert.equal(blocked.success, false);
assert.equal(blockedRuntime.bag.money, 500);
assert.deepEqual(blockedRuntime.bag.slots, [["POTION", 1]]);

const successRuntime = { bag:{ slots:[["POTION", 1]], money:500 } };
const success = commitSafariBagEconomyReceipt(successRuntime, {
  reward:{
    success:true,
    pockets:{ general:{ slots:[["POTION", 1], ["NUGGET", 1]] } },
    granted:[{ item:"NUGGET", quantity:1 }],
    operations:[{ op:"bag_add_all", item:"NUGGET", quantity:1, result:true }],
  },
  money:300,
});
assert.equal(success.success, true);
assert.equal(successRuntime.bag.money, 800);
assert.deepEqual(successRuntime.bag.slots, [["POTION", 1], ["NUGGET", 1]]);
assert.ok(success.operations.some((entry) => entry.op === "bag_add_all"));
assert.ok(success.operations.some((entry) => entry.op === "runtime_grant_item" && entry.item === "NUGGET"));
assert.ok(success.operations.some((entry) => entry.op === "runtime_add_money" && entry.amount === 300));

console.log("bounty target uses shared atomic Bag/economy receipt settlement");
