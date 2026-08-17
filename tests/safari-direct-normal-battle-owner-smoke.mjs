import assert from "node:assert/strict";
import fs from "node:fs";

const facade = fs.readFileSync(new URL("../runtime/safari-web-playable-integration.js", import.meta.url), "utf8");
const round = fs.readFileSync(new URL("../runtime/safari-normal-battle-round.js", import.meta.url), "utf8");
const finalizer = fs.readFileSync(new URL("../runtime/safari-normal-battle-finalize.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(facade, /import\("\.\/safari-normal-battle-round\.js\?v=20260818-0813"\)/);
assert.match(facade, /resolveSafariNormalBattleRound\(runtime, selectedMoveId\)/);
assert.doesNotMatch(facade, /normalBattleModulePromise = import\("\.\/safari-playable-integration-pre-wounded\.js"\)/);
assert.match(round, /resolveBrowserBattleRound/);
assert.match(round, /resolveBrowserTrainerBattleRound/);
assert.match(round, /resolveBrowserOpponentMoveChoiceCanonical/);
assert.doesNotMatch(round, /safari-playable-integration-(?:base|core|legacy|pre-wounded|wounded|boundary)/);
assert.match(finalizer, /resolveDayBoardPlayableTurn/);
assert.match(finalizer, /resolveExpLevelMoveFlow/);
assert.match(finalizer, /trainer_prize_money/);
assert.match(finalizer, /givePotion/);
assert.match(html, /build 20260818-0813/);

console.log("Safari normal wild/trainer move round uses direct Battle owner without migration integration chain: ok");
