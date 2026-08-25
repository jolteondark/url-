import assert from "node:assert/strict";
import fs from "node:fs";

const runtimeSource = fs.readFileSync(new URL("../runtime/safari-old-statue-pray-battle.js", import.meta.url), "utf8");
const touchSource = fs.readFileSync(new URL("../old-statue-touch-presentation.js", import.meta.url), "utf8");
const loaderSource = fs.readFileSync(new URL("../lost-bag-touch-presentation.js", import.meta.url), "utf8");
const htmlSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(runtimeSource, /action === "break" && Number\(event\.normal_data\?\.break_roll \?\? 0\) < 50/);
assert.match(runtimeSource, /activateSafariNormalEventWildBattle\(runtime, index/);
assert.match(runtimeSource, /battle_type:"ROCK", modifier:2, cannot_run:true/);
assert.match(runtimeSource, /applySafariBattleRunConstraint\(runtime, true\)/);
assert.match(runtimeSource, /decision === 1/);
assert.match(runtimeSource, /resolveMaplessNormalEventLargeReward/);
assert.match(runtimeSource, /guardian_reward_pending/);
assert.match(runtimeSource, /old_statue_guardian_reward_pending/);
assert.match(runtimeSource, /resolveOldStatue\(\{ event:guardianRewardEvent\(event\), choice:"break", battle_success:true \}\)/);

assert.match(touchSource, /safari-old-statue-pray-battle\.js\?v=20260826-0830/);
assert.match(loaderSource, /old-statue-touch-presentation\.js\?v=20260826-0830/);
assert.match(htmlSource, /lost-bag-touch-presentation\.js\?v=20260826-0830/);

console.log("safari old statue guardian battle smoke: ok");
