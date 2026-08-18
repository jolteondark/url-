import assert from "node:assert/strict";
import fs from "node:fs";

const facade = fs.readFileSync(new URL("../runtime/safari-web-playable-integration.js", import.meta.url), "utf8");
const round = fs.readFileSync(new URL("../runtime/safari-normal-battle-round.js", import.meta.url), "utf8");
const lifecycle = fs.readFileSync(new URL("../runtime/safari-normal-battle-lifecycle.js", import.meta.url), "utf8");
const finalizer = fs.readFileSync(new URL("../runtime/safari-normal-battle-finalize.js", import.meta.url), "utf8");

assert.match(facade, /import \{ activateSafariWebCombatCell \} from "\.\/safari-web-combat-start\.js";/,
  "ordinary Board combat start must be bound before the user taps a cell");
assert.doesNotMatch(facade, /import\("\.\/safari-web-combat-start\.js/,
  "ordinary Board combat tap must not trigger a combat-start module import");
assert.match(facade, /import \{ resolveSafariNormalBattleRound \} from "\.\/safari-normal-battle-round\.js";/,
  "ordinary Battle round owner must be bound during facade module evaluation");
assert.match(facade, /from "\.\/safari-normal-battle-lifecycle\.js";/,
  "ordinary Battle lifecycle owner must be bound during facade module evaluation");
assert.doesNotMatch(facade, /import\("\.\/safari-normal-battle-round\.js/,
  "ordinary first command must not trigger a dynamic round-module import");
assert.doesNotMatch(facade, /import\("\.\/safari-normal-battle-lifecycle\.js/,
  "ordinary capture/return must not trigger a dynamic lifecycle import");
assert.doesNotMatch(facade, /safari-playable-integration-pre-wounded\.js/,
  "ordinary Battle must not re-enter the migration/content chain");
assert.match(facade, /resolveSafariNormalBattleRound\(runtime, selectedMoveId\)/);
assert.match(round, /resolveBrowserBattleRound/);
assert.match(round, /resolveBrowserTrainerBattleRound/);
assert.match(round, /resolveBrowserOpponentMoveChoiceCanonical/);
assert.doesNotMatch(round, /safari-playable-integration-(?:base|core|legacy|pre-wounded|wounded|boundary)/);
assert.match(lifecycle, /resolveCaptureFlow/);
assert.match(lifecycle, /routeCaughtQueueToPartyStorage/);
assert.match(lifecycle, /resolveDayBoardPlayableTurn/);
assert.match(finalizer, /resolveDayBoardPlayableTurn/);
assert.match(finalizer, /resolveExpLevelMoveFlow/);
assert.match(finalizer, /trainer_prize_money/);
assert.match(finalizer, /givePotion/);

console.log("Safari normal Board start/round/lifecycle are eagerly bound direct owners with no interaction-time migration import: ok");
