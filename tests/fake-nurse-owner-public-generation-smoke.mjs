import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");

assert.match(
  index,
  /\.\/runtime\/safari-fake-nurse-interaction\.js\?v=20260909-1500/,
  "public import map must deliver the owner-driven Fake Nurse adapter generation",
);
assert.doesNotMatch(
  index,
  /\.\/runtime\/safari-fake-nurse-interaction\.js\?v=20260904-1600/,
  "stale pre-owner Fake Nurse generation must not return to the public Safari path",
);

console.log("fake nurse owner public generation smoke: ok");
