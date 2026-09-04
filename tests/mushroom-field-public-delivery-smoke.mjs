import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const interaction = await readFile(new URL("../runtime/safari-mushroom-field-interaction.js", import.meta.url), "utf8");
const receipt = await readFile(new URL("../runtime/safari-bag-economy-receipt.js", import.meta.url), "utf8");

assert.match(index, /"\.\/runtime\/safari-mushroom-field-interaction\.js": "\.\/runtime\/safari-mushroom-field-interaction\.js\?v=20260904-1500"/);
assert.match(index, /"\.\/runtime\/safari-bag-economy-receipt\.js": "\.\/runtime\/safari-bag-economy-receipt\.js\?v=20260904-1400"/);
assert.match(interaction, /commitSafariBagEconomyReceipt\(runtime, \{ money: adjusted \}\)/);
assert.doesNotMatch(interaction, /runtime\.bag\.money\s*=/);
assert.match(receipt, /runtime_add_money/);

console.log("Mushroom Field public delivery points at the shared owner-resolved Bag/Economy receipt generation");
