import assert from "node:assert/strict";
import fs from "node:fs";

const indexSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const minerSource = fs.readFileSync(new URL("../runtime/safari-miner-interaction.js", import.meta.url), "utf8");

assert.match(indexSource, /"\.\/runtime\/safari-miner-interaction\.js": "\.\/runtime\/safari-miner-interaction\.js\?v=20260828-0415"/);
assert.doesNotMatch(indexSource, /safari-miner-interaction\.js\?v=20260828-0258/);
assert.match(minerSource, /MAPLESS_MINER_COLLAPSE_PERCENT_V108 = 5/);
assert.match(minerSource, /const outcomeRoll = Number\(workRandomInt\(100\)\)/);
assert.match(minerSource, /resolveRewardTransaction/);
assert.match(minerSource, /pockets:\{ general:\{ slots, maxSlots, maxPerSlot \} \}/);
assert.match(minerSource, /runtime\.bag\.slots = transaction\.pockets\.general\.slots\.filter\(Boolean\)/);
assert.doesNotMatch(minerSource, /from "\.\/bag-economy-mart-flow\.js"/);
assert.doesNotMatch(minerSource, /function canAddItem/);

console.log("Safari Miner shared Bag owner/cache handoff smoke passed");
