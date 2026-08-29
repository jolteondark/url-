import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../game-menu-bridge.js", import.meta.url), "utf8");

assert.match(source, /import \{ isBattleEscapeItem \} from "\.\/runtime\/item-battle-escape-effects\.js"/);
assert.match(source, /canSafariUseBattleEscapeItem/);
assert.match(source, /useSafariBattleEscapeItem/);
assert.match(source, /const directBattleEscape = battleActive && isBattleEscapeItem\(id\)/);
assert.match(source, /directPartyRevival \|\| directBattleEscape \|\| \(battleActive && isSafariBattleNoTargetItem\(id\)\)/);
assert.match(source, /directBattleEscape\s*\? canSafariUseBattleEscapeItem\(runtime, id\)/);
assert.match(source, /isBattleEscapeItem\(itemId\)\s*\? Promise\.resolve\(useSafariBattleEscapeItem\(runtime, \{ itemId \}\)\)/);

console.log("game menu battle escape item wiring smoke: ok");