import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const adapter = fs.readFileSync(path.join(root, "runtime", "safari-berry-thief-interaction.js"), "utf8");

const continuation = adapter.match(/registerSafariNormalEventBattleContinuation\("berry_thief"[\s\S]*?\n\}\);/)?.[0] ?? "";
assert.ok(continuation, "Berry Thief must keep a registered Battle RETURN continuation");
assert.match(continuation,
  /const rewards = \[\.\.\.restored, \.\.\.\(bonusItem \? \[bonusItem\] : \[\]\)\];[\s\S]*?transaction\(runtime, rewards\)/,
  "stolen-item restoration and hidden reward must settle in one atomic Bag transaction");
assert.match(continuation,
  /if \(resolved && !resolved\.success\) throw new Error\("berry_thief post-battle rewards no longer fit in Bag"\);[\s\S]*?const applied = applyTransaction\(runtime, resolved\)/,
  "capacity failure must happen before any runtime Bag mutation");
assert.equal((continuation.match(/applyTransaction\(runtime,/g) ?? []).length, 1,
  "post-Battle settlement must apply exactly one combined transaction");
assert.doesNotMatch(continuation, /borrowSafariSharedRunRandomInt/,
  "retrying Battle RETURN must never advance shared run RNG");
assert.match(continuation,
  /continuation\.payload\?\.hidden_reward_item/,
  "retry/reload must recover the same hidden reward from persisted continuation payload");
assert.match(adapter,
  /const hiddenReward = action === "chase" && roll < 20 \? reserveHiddenSmallReward\(runtime\) : null;[\s\S]*?activateSafariNormalEventWildBattle\([\s\S]*?hidden_reward_item:hiddenReward\?\.item \?\? null/,
  "eligible chase must reserve the shared-RNG reward before Battle continuation persistence");
assert.match(adapter,
  /request_save", reason:"berry_thief_battle_started"/,
  "Battle start path must request persistence with the reserved continuation payload");

console.log("Berry Thief post-Battle retry-safe smoke passed");
