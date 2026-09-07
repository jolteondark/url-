import assert from "node:assert/strict";
import fs from "node:fs";

const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(index, /\.\/runtime\/safari-pokemon-center-command\.js\?v=20260907-1930/);
assert.match(index, /\.\/runtime\/safari-lost-bag-touch\.js\?v=20260907-1930/);
assert.match(index, /\.\/preview\.js\?v=20260907-1930/);

console.log("lost bag public delivery smoke passed");
