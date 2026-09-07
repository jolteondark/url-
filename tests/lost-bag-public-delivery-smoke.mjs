import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const source = await readFile(new URL("../runtime/safari-lost-bag-interaction.js", import.meta.url), "utf8");

assert.match(html, /"\.\/runtime\/safari-lost-bag-interaction\.js": "\.\/runtime\/safari-lost-bag-interaction\.js\?v=20260904-2000"/);
assert.doesNotMatch(html, /safari-lost-bag-interaction\.js\?v=20260901-2130/);
assert.match(html, /\.\/runtime\/safari-pokemon-center-command\.js\?v=20260907-1930/);
assert.match(html, /\.\/runtime\/safari-lost-bag-touch\.js\?v=20260907-1930/);
assert.match(html, /\.\/preview\.js\?v=20260907-1930/);
assert.match(source, /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/);
assert.doesNotMatch(source, /runtime\.bag\.slots\s*=/);
assert.doesNotMatch(source, /runtime\.bag\.money\s*=/);

console.log("lost bag public delivery smoke ok");
