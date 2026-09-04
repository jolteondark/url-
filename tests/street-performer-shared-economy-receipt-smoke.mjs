import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { commitSafariBagEconomyReceipt } from "../runtime/safari-bag-economy-receipt.js";

const source = await readFile(new URL("../runtime/safari-street-performer-interaction.js", import.meta.url), "utf8");
assert.match(source, /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/);
assert.doesNotMatch(source, /runtime\.bag\.money\s*=/);
assert.doesNotMatch(source, /function addMoney/);
assert.match(source, /commitSafariBagEconomyReceipt\(runtime, \{ money:Number\(moneyOperation\.amount\) \}\)/);
assert.match(source, /commitSafariBagEconomyReceipt\(runtime, \{ moneyDelta:-viewingPrice \}\)/);

const runtime = { bag:{ slots:[["POTION", 1]], money:500 } };
const reward = commitSafariBagEconomyReceipt(runtime, { money:125 });
assert.equal(reward.success, true);
assert.equal(runtime.bag.money, 625);
assert.deepEqual(reward.operations, [{ op:"runtime_add_money", amount:125 }]);

const spend = commitSafariBagEconomyReceipt(runtime, { moneyDelta:-300 });
assert.equal(spend.success, true);
assert.equal(runtime.bag.money, 325);
assert.deepEqual(spend.operations, [{ op:"runtime_spend_money", amount:300 }]);

const before = structuredClone(runtime.bag);
const rejected = commitSafariBagEconomyReceipt(runtime, { moneyDelta:-999 });
assert.equal(rejected.success, false);
assert.equal(rejected.result, "insufficient_money");
assert.deepEqual(runtime.bag, before);

console.log("Street Performer uses shared Bag/Economy receipt for owner-resolved reward and viewing fee");
