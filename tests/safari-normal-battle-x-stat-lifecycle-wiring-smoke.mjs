import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-normal-battle-lifecycle.js", import.meta.url), "utf8");

assert.match(source, /import \{ isSafariBattleStatBoostItem, useSafariBattleStatBoostItem \} from "\.\/safari-battle-stat-boost-item-use\.js"/);
assert.match(source, /const itemUse = isSafariBattleStatBoostItem\(itemId\)/);
assert.match(source, /\? useSafariBattleStatBoostItem\(runtime, \{ itemId, partyIndex: targetIndex \}\)/);
assert.match(source, /: applySafariBagItemToPartyPokemon\(runtime, \{/);
assert.match(source, /const opponentResponse = resolveSafariNormalBattleOpponentResponse\(runtime\)/);
assert.match(source, /turnConsumed: true/);
assert.match(source, /commitSafariCapturedWildRewardGrowth/);

console.log("safari normal battle X-stat lifecycle wiring smoke: ok");
