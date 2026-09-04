import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const source = await readFile(new URL("../runtime/safari-tavern-interaction.js", import.meta.url), "utf8");

assert.match(html, /"\.\/runtime\/safari-tavern-interaction\.js": "\.\/runtime\/safari-tavern-interaction\.js\?v=20260905-0000"/);
assert.doesNotMatch(html, /safari-tavern-interaction\.js\?v=20260901-2130/);
assert.match(html, /"\.\/runtime\/safari-bag-economy-receipt\.js": "\.\/runtime\/safari-bag-economy-receipt\.js\?v=20260904-2200"/);
assert.match(source, /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/);
assert.doesNotMatch(source, /runtime\.bag\.money\s*=/);
assert.match(source, /\.\.\.receipt\.operations/);

console.log("tavern public delivery smoke ok");
