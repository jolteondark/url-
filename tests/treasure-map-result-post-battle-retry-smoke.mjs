import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-treasure-map-result-interaction.js", import.meta.url), "utf8");

assert.match(source, /pendingSafariNormalEventBattleContinuation/);
const retryStart = source.indexOf("function retryCommittedPostBattleReward");
const fakeRoute = source.indexOf("if (map.fake)");
const retryCall = source.indexOf("retryCommittedPostBattleReward(runtime, index)", fakeRoute);
const battleStart = source.indexOf("activateSafariNormalEventTrainerBattle(runtime, index", fakeRoute);

assert.ok(retryStart >= 0, "Treasure Map must expose a post-Battle reward retry path");
assert.match(source.slice(retryStart, fakeRoute), /checkpoint\.committed !== true/);
assert.match(source.slice(retryStart, fakeRoute), /checkpoint\.committed_result\?\.result !== "treasure_map_chest_no_room"/);
assert.match(source.slice(retryStart, fakeRoute), /battleReturn:checkpoint\.battle_return/);
assert.ok(retryCall > fakeRoute, "fake Treasure Map activation must inspect the committed continuation first");
assert.ok(battleStart > retryCall, "post-Battle reward retry must run before any trainer Battle restart");

console.log("Treasure Map post-Battle retry smoke: PASS");
