import fs from "node:fs";
import assert from "node:assert/strict";

const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

const match = index.match(/deferred-ui-loader\.js\?v=([0-9-]+)/);
assert.ok(match, "index.html must cache-bust deferred-ui-loader.js for Safari/public delivery");
assert.notEqual(
  match[1],
  "20260829-1110",
  "deferred UI loader delivery marker must advance after Board presentation convergence changes",
);

console.log("deferred UI loader public delivery smoke: ok");
