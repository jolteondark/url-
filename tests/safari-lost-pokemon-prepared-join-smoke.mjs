import assert from "node:assert/strict";
import fs from "node:fs";

const lostSource = fs.readFileSync(new URL("../runtime/safari-lost-pokemon-interaction.js", import.meta.url), "utf8");
const grantSource = fs.readFileSync(new URL("../runtime/safari-normal-event-pokemon-grant.js", import.meta.url), "utf8");
const indexSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(lostSource, /event\.normal_data\?\.lost_encounter/,
  "Lost Pokemon join must consume the hydrated prepared encounter from normal_data");
assert.match(lostSource, /grantNormalEventPokemonFromPreparedEncounter\(runtime, preparedEncounter\)/,
  "Lost Pokemon join must route the hydrated encounter through the shared Pokemon grant owner");
assert.doesNotMatch(lostSource, /materializeJoinCandidate|0x10a57|buildGeneralEncounterSpeciesPool|resolveSafariGeneralEncounter/,
  "Lost Pokemon Safari join must not regenerate species, level, or encounter RNG locally");
assert.doesNotMatch(lostSource, /routeCaughtQueueToPartyStorage|resolvePokemonRuntimeMasters|updatePokemonRuntime/,
  "Lost Pokemon event adapter must not own Party/Storage/Pokemon materialization mechanics");
assert.match(lostSource, /join_encounter_missing/,
  "missing hydration must fail closed without consuming the event");

assert.match(grantSource, /export function grantNormalEventPokemonFromPreparedEncounter/,
  "the shared normal-event grant owner must expose prepared encounter routing");
assert.match(grantSource, /species = String\(encounter\.species \?\? encounter\.species_id/,
  "prepared encounter materialization must reuse the hydrated species");
assert.match(grantSource, /level = Number\(encounter\.level \?\? encounter\.resolved_level\)/,
  "prepared encounter materialization must reuse the hydrated level");
assert.match(grantSource, /return routeOne\(runtime, materializePreparedEncounterPokemon\(encounter\)\)/,
  "prepared encounters must reuse the existing Party/Storage routing owner");

assert.match(indexSource, /safari-lost-pokemon-interaction\.js\?v=20260827-1755/,
  "physical Safari entry must fetch the post-join Lost Pokemon owner");
assert.match(indexSource, /safari-normal-event-pokemon-grant\.js\?v=20260827-1755/,
  "physical Safari must fetch the prepared-encounter grant owner rather than a cached pre-export generation");

console.log("safari Lost Pokemon prepared join smoke: ok");
