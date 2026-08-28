import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const breakOwner = readFileSync(new URL("../runtime/safari-old-statue-break-collapse.js", import.meta.url), "utf8");
const continuation = readFileSync(new URL("../runtime/safari-old-statue-offer-continuation.js", import.meta.url), "utf8");
const largeReward = readFileSync(new URL("../runtime/safari-large-item-reward.js", import.meta.url), "utf8");
const presentation = readFileSync(new URL("../old-statue-touch-presentation.js", import.meta.url), "utf8");
const canonical = readFileSync(new URL("../runtime/mapless-old-statue-flow.js", import.meta.url), "utf8");

assert.match(canonical, /type:'ROCK',modifier:2,cannot_run:true/);
assert.match(canonical, /battle_success===true\)ops\.push\(\{op:'grant_random',tier:'large',count:1\}\)/);
assert.match(breakOwner, /activateSafariNormalEventWildBattle/);
assert.match(breakOwner, /actionId:"break"/);
assert.match(breakOwner, /payload:\{ guardian_type:"ROCK", cannot_run:true \}/);
assert.match(continuation, /continuation\.actionId === "break"/);
assert.match(continuation, /preflightSafariSharedLargeItemReward/);
assert.match(continuation, /projectMaplessNormalEventOptionalReward/);
assert.match(largeReward, /resolveMaplessNormalEventLargeReward/);
assert.match(largeReward, /applySafariLargeItemReward/);
assert.match(presentation, /safari-old-statue-break-collapse\.js\?v=20260828-2300/);

console.log("Old Statue break guardian Safari wiring smoke passed");
