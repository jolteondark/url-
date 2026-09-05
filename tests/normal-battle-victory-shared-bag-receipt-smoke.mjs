import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../runtime/safari-normal-battle-finalize.js", import.meta.url), "utf8");

assert.match(source, /resolveRewardTransaction/);
assert.match(source, /commitSafariBagEconomyReceipt/);
assert.doesNotMatch(source, /runtime\.bag\.slots\s*=\s*receipt\.slots/);
assert.doesNotMatch(source, /runtime\.bag\.money\s*=/);
assert.match(source, /commitSafariBagEconomyReceipt\(runtime, \{ moneyDelta: gained \}\)/);
assert.match(source, /const cappedTarget = setMoney\(before \+ adjusted, 999999\)/);
assert.match(source, /items:\s*\["POTION"\]/);
assert.match(source, /normal_terminal_reward_growth_committed === true/);
assert.match(source, /normal_terminal_reward_growth_committed = true/);
assert.match(source, /request_save", reason: "battle_result"/);

console.log("normal battle victory shared Bag receipt smoke: ok");
