import fs from "node:fs";
import assert from "node:assert/strict";

const safari = fs.readFileSync(new URL("../runtime/safari-wounded-pokemon-integration.js", import.meta.url), "utf8");
const owner = fs.readFileSync(new URL("../runtime/wounded-pokemon-materialization-runtime.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(safari, /materializePreparedWoundedPokemon\s*}\s*from\s*"\.\/wounded-pokemon-materialization-runtime\.js"/);
assert.doesNotMatch(safari, /resolvePokemonRuntimeMasters|POKEMON_NATURE_MASTERS_V108|resolvePokemonNewCreationFormSpeciesMasterV108|SAFARI_MOVE_MASTERS|SAFARI_SPECIES_MASTERS/);
assert.match(owner, /export function materializePreparedWoundedPokemon/);
assert.match(owner, /resolvePokemonRuntimeMasters/);
assert.match(owner, /hp:\s*1/);
assert.match(owner, /held_item:\s*null/);
assert.match(html, /safari-wounded-pokemon-integration\.js\?v=20260827-2055/);

console.log("safari wounded materializer owner smoke: ok");
