import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../runtime/safari-wounded-pokemon-integration.js", import.meta.url), "utf8");
const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(source, /borrowSafariSharedRunRandomInt/,
  "Wounded Pokemon Safari preparation must use the shared run RNG owner");
assert.match(source, /ensureSafariEncounterSeed/,
  "Wounded Pokemon Safari preparation must initialize the shared run RNG boundary");
assert.match(source, /event\.normal_data\?\.pokemon_data/,
  "prepared wounded Pokemon snapshots must be replayed without taking new shared RNG draws");
assert.match(source, /sharedCounter = Number\(state\.preview_encounter_counter/,
  "initial preparation must snapshot the shared RNG counter");
assert.match(source, /if \(sharedCounter !== null\) state\.preview_encounter_counter = sharedCounter/,
  "failed initial preparation must roll back shared RNG consumption");
assert.doesNotMatch(source, /crypto\.getRandomValues|function browserRandomInt/,
  "Safari adapter must not own a browser-global RNG implementation");
assert.match(index, /safari-wounded-pokemon-integration\.js\?v=20260827-1900/,
  "physical Safari entry must fetch the post-shared-RNG Wounded Pokemon owner");

console.log("safari wounded Pokemon shared-run RNG smoke: ok");
