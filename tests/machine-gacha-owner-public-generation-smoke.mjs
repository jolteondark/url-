import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const indexSource = await readFile(new URL("../index.html", import.meta.url), "utf8");

assert.match(
  indexSource,
  /\.\/runtime\/safari-machine-gacha-interaction\.js\?v=20260909-1100/,
  "public import map must deliver the owner-driven Machine Gacha interaction generation",
);
assert.doesNotMatch(
  indexSource,
  /\.\/runtime\/safari-machine-gacha-interaction\.js\?v=20260908-0530/,
  "stale pre-#1367 Machine Gacha interaction generation must not remain public",
);

console.log("machine gacha owner public generation smoke: ok");
