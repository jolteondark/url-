import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../game-menu-bridge.js", import.meta.url), "utf8");

assert.match(source, /canSafariUseBattleStatBoostItem/);
assert.match(source, /isSafariBattleStatBoostItem/);
assert.match(source, /const directBattleStatBoost = battleActive && isSafariBattleStatBoostItem\(id\)/);
assert.match(source, /directPartyRevival \|\| directBattleEscape \|\| directBattleStatBoost/);
assert.match(source, /directBattleStatBoost\s*\? canSafariUseBattleStatBoostItem\(runtime, \{ itemId: id \}\)/);
assert.match(source, /const statBoost = isSafariBattleStatBoostItem\(itemId\)/);
assert.match(source, /partyIndex: statBoost \? undefined : partyIndex/);
assert.match(source, /useSafariBattleItem\(runtime, \{/);

console.log("game menu battle X-stat wiring smoke: ok");
