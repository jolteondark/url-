import assert from "node:assert/strict";
import fs from "node:fs";

const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(index, /\.\/runtime\/safari-pokemon-center-command\.js\?v=20260907-1430/);
assert.match(index, /\.\/runtime\/safari-old-statue-interaction\.js\?v=20260907-1430/);
assert.match(index, /\.\/normal-event-touch-presentation\.js\?v=20260907-1430/);
assert.match(index, /\.\/preview\.js\?v=20260907-1430/);

console.log("old statue public delivery smoke passed");
