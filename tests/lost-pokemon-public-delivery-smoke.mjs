import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const source = await readFile(new URL("../runtime/safari-lost-pokemon-interaction.js", import.meta.url), "utf8");
const receipt = await readFile(new URL("../runtime/safari-bag-economy-receipt.js", import.meta.url), "utf8");

assert.match(html, /"\.\/runtime\/safari-lost-pokemon-interaction\.js": "\.\/runtime\/safari-lost-pokemon-interaction\.js\?v=20260904-2200"/);
assert.doesNotMatch(html, /safari-lost-pokemon-interaction\.js\?v=20260901-2130/);
assert.match(html, /"\.\/runtime\/safari-bag-economy-receipt\.js": "\.\/runtime\/safari-bag-economy-receipt\.js\?v=20260904-2200"/);
assert.doesNotMatch(html, /safari-bag-economy-receipt\.js\?v=20260904-1400/);
assert.match(source, /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/);
assert.doesNotMatch(source, /runtime\.bag\.slots\s*=/);
assert.match(receipt, /reward\?\.consumed/);
assert.match(receipt, /op:"runtime_remove_item"/);

console.log("lost pokemon public delivery smoke ok");
