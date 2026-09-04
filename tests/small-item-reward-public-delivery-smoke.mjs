import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
assert.match(
  html,
  /"\.\/runtime\/safari-small-item-reward\.js": "\.\/runtime\/safari-small-item-reward\.js\?v=20260904-1030"/,
);
console.log("small-item-reward-public-delivery-smoke: ok");
