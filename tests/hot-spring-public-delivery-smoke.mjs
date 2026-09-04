import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const source = await readFile(new URL("../runtime/safari-hot-spring-interaction.js", import.meta.url), "utf8");

assert.match(index, /"\.\/runtime\/safari-hot-spring-interaction\.js": "\.\/runtime\/safari-hot-spring-interaction\.js\?v=20260904-1630"/);
assert.match(index, /"\.\/runtime\/safari-bag-economy-receipt\.js": "\.\/runtime\/safari-bag-economy-receipt\.js\?v=20260904-1400"/);
assert.match(source, /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/);
assert.doesNotMatch(source, /runtime\.bag\.slots\s*=/);
assert.match(source, /commitSafariBagEconomyReceipt\(runtime, \{ reward:bottleReward \}\)/);

console.log("hot spring public delivery smoke ok");
