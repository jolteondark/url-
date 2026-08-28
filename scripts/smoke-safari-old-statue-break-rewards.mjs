import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const owner = readFileSync(new URL("../runtime/safari-old-statue-break-rewards.js", import.meta.url), "utf8");
const presentation = readFileSync(new URL("../old-statue-touch-presentation.js", import.meta.url), "utf8");
const canonical = readFileSync(new URL("../runtime/mapless-old-statue-flow.js", import.meta.url), "utf8");

assert.match(canonical, /roll<80.*grant_statue_mineral/);
assert.match(canonical, /roll<95.*grant_random',tier:'large'/);
assert.match(owner, /selectMaplessOldStatueMineralV108/);
assert.match(owner, /resolveRewardTransaction/);
assert.match(owner, /preflightSafariSharedLargeItemReward/);
assert.match(owner, /projectMaplessNormalEventOptionalReward/);
assert.match(owner, /roll < 50 \|\| roll >= 95/);
assert.match(owner, /roll < 80/);
assert.match(presentation, /safari-old-statue-break-rewards\.js\?v=20260828-2320/);

console.log("Old Statue break reward Safari wiring smoke passed");
