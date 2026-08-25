import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const adapter = fs.readFileSync(path.join(root, "runtime", "safari-berry-thief-interaction.js"), "utf8");

assert.match(adapter, /resolveMaplessNormalEventSmallReward/,
  "Berry Thief chase bonus must use the shared #833 small-reward owner");
assert.match(adapter, /borrowSafariSharedRunRandomInt/,
  "Berry Thief item selection must borrow the shared persisted run RNG boundary from #838");
assert.match(adapter,
  /function hiddenRoll\(event\)[\s\S]*?new RubyMT19937Random\(\(Number\(event\.normal_seed\) \+ 1\)[\s\S]*?randInt\(100\)/,
  "the canonical hidden 20% eligibility roll must remain event-seeded with normal_seed + 1");
assert.match(adapter,
  /bonusEligible = success && continuation\.actionId === "chase" && roll < 20/,
  "small reward must only be selected after successful chase and hidden roll < 20");
assert.match(adapter,
  /resolveMaplessNormalEventSmallReward\(\{[\s\S]*?count:1,[\s\S]*?randomInt:\(max\) => borrowSafariSharedRunRandomInt\(runtime, max\)/,
  "eligible bonus must perform one shared-owner small reward draw rather than reseeding from the event");
assert.doesNotMatch(adapter, /shared_normal_event_random_reward_pending/,
  "the #834 pending audit placeholder must be removed");
assert.match(adapter, /\.\.\.\(bonus\?\.operations \?\? \[\]\)/,
  "shared selection and atomic Bag operations must be preserved in the continuation audit trail");
assert.match(adapter, /const appliedBonus = applyTransaction\(runtime, bonus\)/,
  "the shared owner's projected bonus must reach the runtime Bag");
assert.match(adapter, /さらに\$\{bonusItem\}を見つけました/,
  "Safari notice must surface the granted chase bonus item");
assert.doesNotMatch(adapter,
  /randomInt:\(max\)\s*=>\s*(?:new\s+)?RubyMT19937Random|randomInt:\(max\)\s*=>\s*hidden/,
  "item selection must never reuse or derive an event-local RNG stream");

console.log("Safari Berry Thief shared small reward wiring smoke passed");
