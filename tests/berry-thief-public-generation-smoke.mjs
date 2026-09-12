import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../index.html", import.meta.url), "utf8");

assert.match(source, /"\.\/runtime\/safari-berry-thief-interaction\.js": "\.\/runtime\/safari-berry-thief-interaction\.js\?v=20260913-0800"/, "public import map must expose the post-#1568 Berry Thief owner generation");
assert.doesNotMatch(source, /safari-berry-thief-interaction\.js\?v=20260910-1901/, "public import map must not retain the pre-#1568 Berry Thief owner generation");

console.log("Berry Thief public generation smoke: PASS");
