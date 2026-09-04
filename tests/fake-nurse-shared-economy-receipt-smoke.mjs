import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { commitSafariBagEconomyReceipt } from "../runtime/safari-bag-economy-receipt.js";

const source = await readFile(new URL("../runtime/safari-fake-nurse-interaction.js", import.meta.url), "utf8");
assert.match(source, /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/);
assert.doesNotMatch(source, /runtime\.bag\.money\s*=/);
assert.doesNotMatch(source, /function addSpend/);
assert.match(source, /commitSafariBagEconomyReceipt\(runtime,\{moneyDelta:-price\}\)/);
assert.match(source, /commitSafariBagEconomyReceipt\(runtime,\{moneyDelta:-halfPrice\}\)/);

const runtime = { bag:{ slots:[["POTION", 1]], money:700 } };
const paid = commitSafariBagEconomyReceipt(runtime, { moneyDelta:-500 });
assert.equal(paid.success, true);
assert.equal(runtime.bag.money, 200);
assert.deepEqual(paid.operations, [{ op:"runtime_spend_money", amount:500 }]);

const before = structuredClone(runtime.bag);
const rejected = commitSafariBagEconomyReceipt(runtime, { moneyDelta:-300 });
assert.equal(rejected.success, false);
assert.equal(rejected.result, "insufficient_money");
assert.deepEqual(runtime.bag, before);

console.log("Fake Nurse uses shared Bag/Economy receipt for full-price and half-price treatment fees");
