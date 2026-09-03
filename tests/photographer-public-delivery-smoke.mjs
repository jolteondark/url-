import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const adapter = fs.readFileSync(path.join(root, "runtime", "safari-photographer-interaction.js"), "utf8");

assert.match(index,
  /"\.\/runtime\/safari-photographer-interaction\.js": "\.\/runtime\/safari-photographer-interaction\.js\?v=20260903-2000"/,
  "Safari public import map must retain the currently published Photographer generation until the next delivery bump");
assert.match(adapter, /commitSafariBagEconomyReceipt\(runtime, \{ reward, money:baseMoney \}\)/,
  "Photographer item-success settlement must use the shared reward+money receipt");
assert.match(adapter, /commitSafariBagEconomyReceipt\(runtime, \{ money:payout \}\)/,
  "Photographer Bag-full fallback must use the shared money receipt");
assert.match(adapter, /const payout = baseMoney \+ \(reward\.success \? 0 : 300\)/,
  "Photographer Bag-full fallback must preserve canonical +300 yen compensation");
assert.doesNotMatch(adapter, /terminal:false, reward/,
  "Photographer successful Battle RETURN must not leave a retryable continuation result");
assert.doesNotMatch(adapter, /function addMoney\s*\(/,
  "Photographer adapter must not restore local money mutation");

console.log("Photographer public delivery smoke passed");
