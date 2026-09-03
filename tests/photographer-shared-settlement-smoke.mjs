import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../runtime/safari-photographer-interaction.js", import.meta.url), "utf8");

assert.match(source, /commitSafariBagEconomyReceipt/);
assert.doesNotMatch(source, /applySafariSmallItemReward/);
assert.doesNotMatch(source, /function addMoney\s*\(/);
assert.doesNotMatch(source, /runtime\.bag\.money\s*=/);

const wildReceipt = source.indexOf("commitSafariBagEconomyReceipt(runtime, { reward, money })");
const boardCommit = source.indexOf("state.board_events[index] = owner.event", wildReceipt);
assert.ok(wildReceipt >= 0, "wild Photographer victory must use shared reward+money receipt");
assert.ok(boardCommit > wildReceipt, "Board resolution must happen only after shared receipt success");

assert.match(source, /preflightSafariSmallItemReward\(runtime, rewardItem\)/);
assert.match(source, /payload:\{ requested_type:requestedType\(event\), reward_item:rewardItem \}/);
assert.match(source, /reserveSharedSmallReward\(runtime\)/);
assert.match(source, /state\.preview_encounter_counter = reserved\.counter/);
assert.match(source, /request_save", reason:"photographer_battle_started"/);
assert.doesNotMatch(source, /terminal:false, reward/);
assert.match(source, /commitSafariBagEconomyReceipt\(runtime, \{ money \}\)/);

console.log("photographer shared settlement smoke: ok");
