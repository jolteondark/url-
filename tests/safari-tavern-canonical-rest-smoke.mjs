import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../runtime/safari-tavern-interaction.js", import.meta.url), "utf8");
const legacy = await readFile(new URL("../runtime/safari-tavern-interaction-legacy.js", import.meta.url), "utf8");

assert.match(source, /healSafariPartyPercent\(runtime, 50, \{ cureStatus:true \}\)/);
assert.doesNotMatch(source, /pokemonMoveTotalPp|setPokemonRuntimeMovePp|SAFARI_MOVE_MASTERS/);
assert.doesNotMatch(source, /Math\.floor\(maxHp \/ 4\)/);
assert.match(legacy, /function partialHealParty\(runtime\)/);
assert.match(source, /if \(action !== "rest"\) return legacy\.resolveSafariTavernAction/);
assert.match(source, /request_save", reason:"tavern_rest"/);

console.log("Safari Tavern canonical rest smoke passed");
