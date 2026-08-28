import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const owner = readFileSync(new URL("../runtime/safari-old-statue-offer-continuation.js", import.meta.url), "utf8");
const presentation = readFileSync(new URL("../old-statue-touch-presentation.js", import.meta.url), "utf8");

assert.match(owner, /registerSafariNormalEventBattleContinuation\("old_statue"/);
assert.match(owner, /continuation\.actionId !== "offer"/);
assert.match(owner, /choice:"offer"/);
assert.match(owner, /offered_item:offeredItem/);
assert.match(owner, /type_id:battleType/);
assert.match(owner, /board_consumed\[index\] = Boolean\(owner\.event\.normal_resolved\)/);
assert.match(owner, /terminal:true/);
assert.doesNotMatch(owner, /activateSafariNormalEventWildBattle/);
assert.match(presentation, /safari-old-statue-offer-continuation\.js\?v=20260828-1955/);
assert.doesNotMatch(presentation, /from "\.\/runtime\/safari-old-statue-offer-bonus\.js\?v=20260826-1825"/);

console.log("safari old statue offer continuation smoke: ok");
