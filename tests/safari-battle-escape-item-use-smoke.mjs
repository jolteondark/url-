import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-battle-escape-item-use.js", import.meta.url), "utf8");

assert.match(source, /resolveBattleEscapeItemEffect/);
assert.match(source, /safariBattleCanRun\(runtime\)/);
assert.match(source, /certainEscapeByItem: true/);
assert.match(source, /commandKind: "item"/);
assert.match(source, /if \(!result\.escaped \|\| Number\(result\.decision\) !== 3\)/);
assert.match(source, /remove\(runtime\.bag\.slots, id, 1\)/);
assert.match(source, /use_item_in_battle/);
assert.match(source, /remove_item/);
assert.match(source, /persistenceRequested: true/);

console.log("safari battle escape item adapter smoke: ok");
