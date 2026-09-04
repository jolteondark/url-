import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const source = await readFile(new URL("../runtime/safari-wounded-pokemon-integration.js", import.meta.url), "utf8");

assert.match(html, /"\.\/runtime\/safari-wounded-pokemon-integration\.js": "\.\/runtime\/safari-wounded-pokemon-integration\.js\?v=20260904-1900"/);
assert.doesNotMatch(html, /safari-wounded-pokemon-integration\.js\?v=20260901-2130/);
assert.match(source, /import \{ commitSafariBagEconomyReceipt \} from "\.\/safari-bag-economy-receipt\.js";/);
assert.doesNotMatch(source, /runtime\.bag\.slots\s*=/);

console.log("wounded pokemon public delivery smoke ok");
