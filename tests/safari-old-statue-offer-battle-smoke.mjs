import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sidecar = await readFile(new URL("../runtime/safari-old-statue-offer-battle.js", import.meta.url), "utf8");
const continuation = await readFile(new URL("../runtime/safari-old-statue-pray-battle.js", import.meta.url), "utf8");
const eligibility = await readFile(new URL("../runtime/safari-old-statue-offer-eligibility.js", import.meta.url), "utf8");
const touch = await readFile(new URL("../old-statue-touch-presentation.js", import.meta.url), "utf8");
const loader = await readFile(new URL("../lost-bag-touch-presentation.js", import.meta.url), "utf8");
const index = await readFile(new URL("../index.html", import.meta.url), "utf8");

assert.match(sidecar, /resolved\.branch === "neutral" && resolved\.effectIndex === 0/);
assert.match(sidecar, /selectMaplessOldStatueBattleTypeV108/);
assert.match(sidecar, /borrowSafariSharedRunRandomInt/);
assert.match(sidecar, /resolveRewardTransaction/);
assert.match(sidecar, /costs:\[\{ item:offeredItem, quantity:1 \}\]/);
assert.match(sidecar, /actionId:"offer"/);
assert.match(sidecar, /payload:\{ battle_type:selected\.value, offered_item:offeredItem \}/);
assert.match(sidecar, /if \(started\.result !== "normal_event_wild_battle_started"\)[\s\S]*preview_encounter_counter = counter/);
assert.match(sidecar, /runtime\.bag\.slots = transaction\.pockets\.general\.slots\.filter\(Boolean\)/);
assert.match(continuation, /continuation\.actionId === "offer"/);
assert.match(continuation, /choice:"offer"/);
assert.match(continuation, /offered_item:offeredItem/);
assert.match(continuation, /old_statue continuation only owns pray\/offer\/break Battle here/);
assert.match(eligibility, /safari-old-statue-offer-battle\.js\?v=20260826-1700/);
assert.match(touch, /safari-old-statue-offer-eligibility\.js\?v=20260826-1700/);
assert.match(loader, /old-statue-touch-presentation\.js\?v=20260826-1700/);
assert.match(index, /lost-bag-touch-presentation\.js\?v=20260826-1700/);

console.log("Old Statue offer Battle Safari smoke: OK");
