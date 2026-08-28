import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../runtime/safari-lost-pokemon-interaction.js", import.meta.url), "utf8");

assert.match(source, /projectMaplessNormalEventOptionalReward/);
assert.match(source, /ownerResult:preview, rewardResult:transaction/);
assert.match(source, /バッグがいっぱいでお礼の道具は持ち帰れませんでした/);
assert.doesNotMatch(source, /まだ探索は完了していません/);
assert.match(source, /result:preview\.outcome, completed:true, optionalReward/);

console.log("safari lost pokemon optional reward static smoke: ok");
