import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../runtime/safari-lost-pokemon-interaction.js", import.meta.url), "utf8");

assert.match(source, /pickMaplessNormalEventMediumRewards/);
assert.match(source, /borrowSafariSharedRunRandomInt/);
assert.match(source, /preview\.outcome === "search_trainer_reward"/);
assert.match(source, /count:1/);
assert.match(source, /preview_encounter_counter = sharedCounter/);
assert.doesNotMatch(source, /rewardItem\(event, 0x5ea2c\)/);

console.log("Lost Pokémon Safari search uses the shared medium reward owner and shared run RNG.");
