import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../index.html", import.meta.url), "utf8");

assert.match(source, /"\.\/runtime\/safari-sleeping-giant-interaction\.js": "\.\/runtime\/safari-sleeping-giant-interaction\.js\?v=20260913-0900"/, "public import map must expose the post-#1573 Sleeping Giant owner generation");
assert.doesNotMatch(source, /safari-sleeping-giant-interaction\.js\?v=20260909-2200/, "public import map must not retain the pre-#1573 Sleeping Giant owner generation");

console.log("Sleeping Giant public generation smoke: PASS");
