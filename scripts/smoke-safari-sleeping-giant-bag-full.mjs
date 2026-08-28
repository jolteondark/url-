import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../runtime/safari-sleeping-giant-interaction.js", import.meta.url), "utf8");
const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(source, /activateSafariNormalEventWildBattle\(runtime, index,/,
  "Sleeping Giant fight/failed-steal must reach the existing wild Battle owner");
assert.doesNotMatch(source, /result:\s*"bag_unavailable"/,
  "Bag capacity must not preflight-block Sleeping Giant");
assert.doesNotMatch(source, /throw new Error\("バッグがいっぱい/,
  "Bag-full reward must not leave Sleeping Giant retryable");
assert.match(source, /if \(!resolved\?\.success\) return \[\];/,
  "failed Bag reward must be tolerated");
assert.match(source, /state\.board_consumed\[index\] = Boolean\(owner\.event\.normal_resolved\);/,
  "post-Battle canonical completion must consume the event");
assert.match(source, /rewardAttempt\?\.success \? `巨体のポケモンを退け、\$\{item\}を回収しました。` : `巨体のポケモンを退けましたが、バッグがいっぱいで\$\{item\}は持ち帰れませんでした。`/,
  "victory must finish even if the reward is lost to Bag capacity");
assert.match(source, /rewardAttempt\.success\s*\n\s*\? `眠っている隙に\$\{item\}を回収しました。`\s*\n\s*:\s*`眠っている隙に手を伸ばしましたが、バッグがいっぱいで\$\{item\}は持ち帰れませんでした。`/,
  "successful steal must finish even if the reward is lost to Bag capacity");
assert.match(source, /filter\(\(operation\) => operation\?\.op !== "start_wild_battle" && operation\?\.op !== "grant_items"\)/,
  "post-Battle canonical grant op must not duplicate the shared Bag transaction");
assert.match(index, /safari-sleeping-giant-interaction\.js\?v=20260828-1405/,
  "Safari import map must fetch the post-fix Sleeping Giant owner");

console.log("smoke-safari-sleeping-giant-bag-full: ok");
