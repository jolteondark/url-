import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const target = fs.readFileSync(new URL("../runtime/safari-bounty-target-interaction.js", import.meta.url), "utf8");

const generation = "20260903-1505";
assert.match(html, new RegExp(`"\\./runtime/safari-bounty-target-interaction\\.js": "\\./runtime/safari-bounty-target-interaction\\.js\\?v=${generation}"`));
assert.match(html, new RegExp(`"\\./runtime/safari-bag-economy-receipt\\.js": "\\./runtime/safari-bag-economy-receipt\\.js\\?v=${generation}"`));
assert.match(target, /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/);
assert.match(target, /commitSafariBagEconomyReceipt\(runtime/);
assert.doesNotMatch(target, /function addMoney/);
assert.doesNotMatch(target, /applySafariLargeItemReward/);

console.log("bounty target shared settlement Safari public delivery smoke passed");
