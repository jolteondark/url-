import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../runtime/safari-photographer-interaction.js", import.meta.url), "utf8");

assert.match(source, /commitSafariBagEconomyReceipt/);
assert.doesNotMatch(source, /applySafariSmallItemReward/);
assert.doesNotMatch(source, /function addMoney\s*\(/);
assert.doesNotMatch(source, /runtime\.bag\.money\s*=/);

const wildRewardReceipt = source.indexOf("commitSafariBagEconomyReceipt(runtime, { reward, money:baseMoney })");
const fallbackReceipt = source.indexOf("commitSafariBagEconomyReceipt(runtime, { money:payout })");
const boardCommit = source.indexOf("state.board_events[index] = owner.event", wildRewardReceipt);
assert.ok(wildRewardReceipt >= 0, "wild Photographer item success must use shared reward+money receipt");
assert.ok(fallbackReceipt > wildRewardReceipt, "Bag-full Photographer reward must use shared money-only fallback receipt");
assert.ok(boardCommit > fallbackReceipt, "Board resolution must happen only after shared receipt selection/commit");

assert.match(source, /const payout = baseMoney \+ \(reward\.success \? 0 : 300\)/);
assert.match(source, /const reward = sharedSmallReward\(runtime\)/);
assert.doesNotMatch(source, /preview_encounter_counter\s*=\s*counter/);
assert.doesNotMatch(source, /terminal:false, reward/);
assert.match(source, /operation\?\.op !== "add_money"/);
assert.match(source, /commitSafariBagEconomyReceipt\(runtime, \{ money \}\)/);

console.log("photographer shared settlement smoke: ok");
