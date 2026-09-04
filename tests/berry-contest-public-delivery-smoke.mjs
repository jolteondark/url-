import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const source = await readFile(new URL("../runtime/safari-berry-contest-interaction.js", import.meta.url), "utf8");

assert.match(index, /"\.\/runtime\/safari-berry-contest-interaction\.js": "\.\/runtime\/safari-berry-contest-interaction\.js\?v=20260905-0800"/);
assert.doesNotMatch(index, /safari-berry-contest-interaction\.js\?v=20260903-0831/);
assert.match(source, /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/);
assert.doesNotMatch(source, /runtime\.bag\.slots\s*=/);
assert.doesNotMatch(source, /runtime\.bag\.money\s*=/);
assert.match(source, /commitSafariBagEconomyReceipt\(runtime, \{ reward:resolved \}\)/);

console.log("Berry Contest Safari delivery reaches the shared Bag/Economy receipt owner");
