import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-lost-bag-interaction.js", import.meta.url), "utf8");

assert.match(source, /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/);
assert.doesNotMatch(source, /runtime\.bag\.slots\s*=/);
assert.doesNotMatch(source, /runtime\.bag\.money\s*=/);
assert.doesNotMatch(source, /function addMoney/);
assert.match(source, /commitSafariBagEconomyReceipt\(runtime, \{ reward \}\)/);
assert.match(source, /commitSafariBagEconomyReceipt\(runtime, \{ money:moneyOperation\.amount \}\)/);
assert.match(source, /request_save", reason:"lost_bag_resolved"/);

console.log("Lost Bag rewards and money use the shared Safari Bag/Economy receipt");
