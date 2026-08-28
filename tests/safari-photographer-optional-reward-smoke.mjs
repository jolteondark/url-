import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../runtime/safari-photographer-interaction.js", import.meta.url), "utf8");
const canonical = fs.readFileSync(new URL("../runtime/mapless-normal-events-a3-flow.js", import.meta.url), "utf8");
const shared = fs.readFileSync(new URL("../runtime/mapless-normal-event-optional-reward.js", import.meta.url), "utf8");

assert.match(source, /projectMaplessNormalEventOptionalReward/,
  "Photographer must reuse the shared optional-reward completion boundary");
assert.doesNotMatch(source, /canAcceptSharedSmallReward/,
  "Bag capacity must not preflight-block Photographer wild Battle");
assert.doesNotMatch(source, /reward_bag_full/,
  "Photographer wild route must not remain retryable on full Bag");
assert.doesNotMatch(source, /shared small reward no longer fits in Bag/,
  "post-Battle optional reward failure must not throw");
assert.match(source, /operation\?\.op !== "start_wild_battle" && operation\?\.op !== "grant_random"/,
  "canonical grant_random op must not duplicate the shared Bag transaction");
assert.match(source, /completed:true, terminal:true, reward, optionalReward/,
  "wild victory must complete after optional reward projection");
assert.match(source, /バッグがいっぱいで道具は持ち帰れませんでした/,
  "Safari must explain reward loss while preserving completion");
assert.match(canonical, /battle_success\)ops\.push\(\{op:'camera_shutter'\},\{op:'add_money',amount:1200\+scaling\*200\},\{op:'grant_random',tier:'small',quantity:1\}\);return finish/,
  "canonical Photographer wild win must keep item reward optional to the finished event");
assert.match(shared, /rewardSkipped:\s*!granted/,
  "shared optional reward projection must remain available");

console.log("Safari Photographer optional reward smoke passed");
