import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-burning-wagon-interaction.js", import.meta.url), "utf8");
const smallRewardSource = await readFile(new URL("../runtime/safari-small-item-reward.js", import.meta.url), "utf8");

assert.match(source, /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/);
assert.match(source, /commitSafariBagEconomyReceipt\(runtime, \{ reward \}\)/);
assert.doesNotMatch(source, /runtime\.bag\.slots\s*=\s*reward\.pockets\.general\.slots/);
assert.doesNotMatch(source, /reward\.granted\.map\(\(entry\) => \(\{ op:"runtime_grant_item"/);
assert.match(source, /if \(reward && !reward\.success\)[\s\S]*?completed:false,[\s\S]*?persistenceRequested:false/);

assert.match(source, /applySafariSmallItemReward\(runtime, manualSharedReward\)/);
assert.match(smallRewardSource, /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/);
assert.match(smallRewardSource, /commitSafariBagEconomyReceipt\(runtime, \{ reward \}\)/);
assert.doesNotMatch(smallRewardSource, /runtime\.bag\.slots\s*=/);
assert.match(smallRewardSource, /return receipt\.granted\.map\(\(entry\) => \(\{ op:"runtime_grant_item"/);

console.log("burning-wagon-shared-receipt-smoke: ok");
