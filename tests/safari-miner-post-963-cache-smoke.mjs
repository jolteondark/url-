import assert from "node:assert/strict";
import fs from "node:fs";

const indexSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const minerSource = fs.readFileSync(new URL("../runtime/safari-miner-interaction.js", import.meta.url), "utf8");

assert.match(indexSource, /"\.\/runtime\/safari-miner-interaction\.js": "\.\/runtime\/safari-miner-interaction\.js\?v=20260828-0258"/);
assert.doesNotMatch(indexSource, /safari-miner-interaction\.js\?v=20260828-0200/);
assert.match(minerSource, /MAPLESS_MINER_COLLAPSE_PERCENT_V108 = 5/);
assert.match(minerSource, /const outcomeRoll = Number\(workRandomInt\(100\)\)/);

console.log("Safari Miner post-#963 cache handoff smoke passed");
