import assert from "node:assert/strict";
import fs from "node:fs";

const owner = fs.readFileSync(new URL("../runtime/safari-lost-bag-interaction.js", import.meta.url), "utf8");
const presentation = fs.readFileSync(new URL("../lost-bag-touch-presentation.js", import.meta.url), "utf8");
const canonical = fs.readFileSync(new URL("../runtime/mapless-lost-bag-flow.js", import.meta.url), "utf8");

assert.match(canonical, /grant_random_result!==false/);
assert.match(canonical, /return finish\(event,operations,'safe_open_reward'\)/);
assert.match(owner, /projectMaplessNormalEventOptionalReward/);
assert.doesNotMatch(owner, /canGuaranteeSingleMediumReward/);
assert.doesNotMatch(owner, /post-battle medium reward no longer fits in Bag/);
assert.doesNotMatch(owner, /イベントはまだ完了していません/);
assert.doesNotMatch(owner, /袋はまだ開けていません/);
assert.match(owner, /completed:true, reward, optionalReward/);
assert.match(presentation, /safari-lost-bag-interaction\.js\?v=20260829-0715/);

console.log("safari lost bag optional reward static smoke: ok");
