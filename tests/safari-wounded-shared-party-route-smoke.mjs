import assert from "node:assert/strict";
import fs from "node:fs";

const wounded = fs.readFileSync(new URL("../runtime/safari-wounded-pokemon-integration.js", import.meta.url), "utf8");
const grant = fs.readFileSync(new URL("../runtime/safari-normal-event-pokemon-grant.js", import.meta.url), "utf8");
const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(wounded, /grantNormalEventPokemon\(runtime, resolved\.joinedPokemon\)/,
  "Wounded Pokemon join must delegate Party/Storage routing to the shared normal-event grant owner");
assert.doesNotMatch(wounded, /runtime\.player\.party\s*=\s*\[\.\.\.party, resolved\.joinedPokemon\]/,
  "Wounded Pokemon Safari adapter must not append directly to Party");
assert.match(wounded, /result: "join_storage_full"[\s\S]*itemRemoved: false[\s\S]*persistenceRequested: false/,
  "Party/Storage full must fail closed before consuming the healing item or event");
assert.match(wounded, /runtime\.bag\.slots = resolved\.slots/,
  "the healing item should only commit after shared Party/Storage routing succeeds");

assert.match(grant, /export function grantNormalEventPokemon\(runtime, pokemon\)/,
  "shared normal-event grant owner must accept an already-materialized Pokemon runtime");
assert.match(grant, /return routeOne\(runtime, structuredClone\(pokemon\)\)/,
  "already-materialized Pokemon must reuse the existing Party/Storage routing owner");

assert.match(index, /safari-normal-event-pokemon-grant\.js\?v=20260827-2005/,
  "physical Safari must fetch the shared grant generation exposing grantNormalEventPokemon");
assert.match(index, /safari-wounded-pokemon-integration\.js\?v=20260827-2005/,
  "physical Safari must fetch the post-shared-routing Wounded Pokemon owner");

console.log("safari wounded Pokemon shared Party/Storage route smoke: ok");
