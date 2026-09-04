import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const source = await readFile(new URL("../runtime/safari-fake-nurse-interaction.js", import.meta.url), "utf8");

assert.match(index, /"\.\/runtime\/safari-fake-nurse-interaction\.js": "\.\/runtime\/safari-fake-nurse-interaction\.js\?v=20260904-1600"/);
assert.match(index, /"\.\/runtime\/safari-bag-economy-receipt\.js": "\.\/runtime\/safari-bag-economy-receipt\.js\?v=20260904-1400"/);
assert.match(source, /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/);
assert.doesNotMatch(source, /runtime\.bag\.money\s*=/);
assert.match(source, /commitSafariBagEconomyReceipt\(runtime,\{moneyDelta:-price\}\)/);
assert.match(source, /commitSafariBagEconomyReceipt\(runtime,\{moneyDelta:-halfPrice\}\)/);

console.log("fake nurse public delivery smoke ok");
