import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-flooded-river-interaction.js", import.meta.url), "utf8");

assert.match(source, /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/);
assert.match(source, /commitSafariBagEconomyReceipt\(runtime, \{ reward: specialReward \}\)/);
assert.doesNotMatch(source, /runtime\.bag\.slots\s*=\s*specialReward\.pockets\.general\.slots/);
assert.doesNotMatch(source, /specialReward\.granted\.map\(\(entry\) => \(\{ op: "runtime_grant_item"/);
assert.match(source, /if \(!specialReward\.success\)[\s\S]*?completed: false,[\s\S]*?persistenceRequested: false/);

console.log("flooded-river-shared-receipt-smoke: ok");
