import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const adapter = fs.readFileSync(path.join(root, "runtime", "safari-berry-thief-interaction.js"), "utf8");

assert.match(
  adapter,
  /resolveMaplessNormalEventSmallReward/,
  "Berry Thief chase bonus must use the shared normal-event small reward owner",
);
assert.match(
  adapter,
  /function hiddenRewardSequence\(event\)[\s\S]*?new RubyMT19937Random\(\(Number\(event\.normal_seed\) \+ 1\)[\s\S]*?roll:rng\.randInt\(100\)/,
  "Berry Thief hidden roll must retain the canonical event RNG sequence",
);
assert.match(
  adapter,
  /resolveMaplessNormalEventSmallReward\(\{[\s\S]*?randomInt:\(max\) => hidden\.rng\.randInt\(max\)/,
  "small reward selection must consume the next draw from the same hidden-reward RNG stream",
);
assert.doesNotMatch(
  adapter,
  /shared_normal_event_random_reward_pending/,
  "resolved #830/#833 reward must not remain as a pending audit operation",
);
assert.match(
  adapter,
  /bonusItem[\s\S]*?さらに\$\{bonusItem\}を見つけました/,
  "Safari notice should surface the granted chase bonus item",
);

console.log("Safari Berry Thief shared small reward owner smoke passed");
