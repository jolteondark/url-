import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const adapter = fs.readFileSync(path.join(root, "runtime", "safari-berry-thief-interaction.js"), "utf8");

assert.match(index,
  /"\.\/runtime\/safari-berry-thief-interaction\.js": "\.\/runtime\/safari-berry-thief-interaction\.js\?v=20260905-0930"/,
  "Safari public import map must publish the post-#1238 Berry Thief generation");
assert.doesNotMatch(index, /safari-berry-thief-interaction\.js\?v=20260903-1800/,
  "Safari public import map must not retain the pre-shared-receipt Berry Thief generation");
assert.match(adapter, /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/,
  "published Berry Thief adapter must use the shared Bag\/Economy receipt owner");
assert.doesNotMatch(adapter, /runtime\.bag\.slots\s*=/,
  "published Berry Thief adapter must not directly mutate Safari Bag slots");
assert.doesNotMatch(adapter, /function\s+applyTransaction\s*\(/,
  "published Berry Thief adapter must not retain a local Bag transaction mutation helper");
assert.match(adapter, /commitSafariBagEconomyReceipt\(runtime, \{ reward:resolved \}\)/,
  "post-Battle and rare-berry rewards must commit through the shared receipt");
assert.match(adapter, /commitSafariBagEconomyReceipt\(runtime, \{ reward:debit \}\)/,
  "bait consumption must commit through the shared receipt");
assert.match(adapter, /hidden_reward_item:hiddenReward\?\.item \?\? null/,
  "published Berry Thief adapter must persist the reserved hidden reward in the Battle continuation payload");
assert.match(adapter, /const rewards = \[\.\.\.restored, \.\.\.\(bonusItem \? \[bonusItem\] : \[\]\)\]/,
  "published Berry Thief adapter must settle restored items and hidden reward together");

console.log("Berry Thief public delivery reaches the shared Bag/Economy receipt owner");