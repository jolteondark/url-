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
  /function reserveHiddenSmallReward\(runtime\)[\s\S]*?resolveMaplessNormalEventSmallReward\(\{[\s\S]*?randomInt:\(max\) => borrowSafariSharedRunRandomInt\(runtime, max\)/,
  "eligible bonus must perform one shared-owner draw rather than reseeding from the event");
assert.match(adapter,
  /payload:\{ berry, hidden_reward_roll:roll, hidden_reward_item:hiddenReward\?\.item \?\? null \}/,
  "the selected hidden reward must be persisted in the Battle continuation payload");
assert.match(adapter,
  /bonusItem = bonusEligible \? String\(continuation\.payload\?\.hidden_reward_item \?\? ""\) : ""/,
  "Battle RETURN must reuse the reserved item rather than draw again");
assert.doesNotMatch(adapter,
  /registerSafariNormalEventBattleContinuation\("berry_thief"[\s\S]*?randomInt:\(max\) => borrowSafariSharedRunRandomInt\(runtime, max\)/,
  "Battle RETURN must not consume shared run RNG for hidden reward selection");
assert.match(adapter, /さらに\$\{bonusItem\}を見つけました/,
  "Safari notice must surface the granted chase bonus item");
assert.doesNotMatch(adapter,
  /randomInt:\(max\)\s*=>\s*(?:new\s+)?RubyMT19937Random|randomInt:\(max\)\s*=>\s*hidden/,
  "item selection must never reuse or derive an event-local RNG stream");

console.log("Safari Berry Thief shared small reward wiring smoke passed");
