import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../runtime/safari-fake-nurse-interaction.js", import.meta.url), "utf8");
const shared = fs.readFileSync(new URL("../runtime/mapless-normal-event-optional-reward.js", import.meta.url), "utf8");
const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(source, /projectMaplessNormalEventOptionalReward/,
  "Fake Nurse must reuse the shared optional-reward completion boundary");
assert.match(source, /grant_random_result:reward\.success/,
  "canonical owner must receive the actual optional reward result");
assert.doesNotMatch(source, /イベントはまだ完了していません/,
  "Bag-full must not keep Fake Nurse retryable");
assert.match(source, /completed:true,reward,optionalReward/,
  "optional reward loss must still complete the event");
assert.match(source, /バッグがいっぱいで落とした道具は持ち帰れませんでした/,
  "Safari notice must explain optional reward loss without implying retry");
assert.match(shared, /completed:\s*true/,
  "shared optional reward owner must remain present");
assert.match(index, /safari-fake-nurse-interaction\.js\?v=20260828-1705/,
  "Safari entry must fetch the post-fix Fake Nurse owner");

console.log("Safari Fake Nurse optional reward smoke passed");
