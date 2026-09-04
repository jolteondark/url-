import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-hot-spring-interaction.js", import.meta.url), "utf8");

assert.match(source, /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/);
assert.match(source, /commitSafariBagEconomyReceipt\(runtime, \{ reward:bottleReward \}\)/);
assert.doesNotMatch(source, /runtime\.bag\.slots\s*=/);
assert.match(source, /if \(!bottleReward\.success\)[\s\S]*persistenceRequested:false/);
assert.match(source, /persistenceRequested: Boolean\(owner\.result\) \|\| runEnd\.finished/);

console.log("hot spring shared receipt smoke ok");
