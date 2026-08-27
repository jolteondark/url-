import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs.readFileSync(new URL("../runtime/safari-lost-pokemon-interaction.js", import.meta.url), "utf8");
const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(source, /pickMaplessNormalEventSmallRewards/);
assert.match(source, /borrowSafariSharedRunRandomInt\(runtime, max\)/);
assert.match(source, /sharedCounter = Number\(state\.preview_encounter_counter/);
assert.match(source, /state\.preview_encounter_counter = sharedCounter/);
assert.doesNotMatch(source, /const LOW_ITEMS/);
assert.doesNotMatch(source, /0xbe22f/);
assert.doesNotMatch(source, /function rewardItem/);
assert.match(source, /resolveLostPokemon\(\{ event, action:"berry", berry, remove_success:true, rare_thanks:false \}\)/);
assert.match(index, /safari-lost-pokemon-interaction\.js\?v=20260827-1615/);

console.log("safari Lost Pokemon berry shared-small smoke: ok");
