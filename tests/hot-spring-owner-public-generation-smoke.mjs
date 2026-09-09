import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");

assert.match(
  index,
  /\.\/runtime\/safari-hot-spring-interaction\.js\?v=20260909-1200/,
  "public import map must deliver the owner-driven Hot Spring adapter generation",
);
assert.doesNotMatch(
  index,
  /\.\/runtime\/safari-hot-spring-interaction\.js\?v=20260904-1630/,
  "stale pre-owner Hot Spring generation must not return to the public Safari path",
);

console.log("hot spring owner public generation smoke: ok");
