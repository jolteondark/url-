import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const interaction = await readFile(new URL("../runtime/safari-street-performer-interaction.js", import.meta.url), "utf8");
const receipt = await readFile(new URL("../runtime/safari-bag-economy-receipt.js", import.meta.url), "utf8");

assert.match(index, /"\.\/runtime\/safari-street-performer-interaction\.js": "\.\/runtime\/safari-street-performer-interaction\.js\?v=20260904-1400"/);
assert.match(index, /"\.\/runtime\/safari-bag-economy-receipt\.js": "\.\/runtime\/safari-bag-economy-receipt\.js\?v=20260904-1400"/);
assert.match(interaction, /commitSafariBagEconomyReceipt\(runtime, \{ moneyDelta:-viewingPrice \}\)/);
assert.match(receipt, /moneyDelta = null/);
assert.match(receipt, /runtime_spend_money/);

console.log("Street Performer public delivery points at the shared owner-resolved Bag/Economy receipt generation");
