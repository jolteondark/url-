import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const miner = await readFile(new URL("../runtime/safari-miner-interaction.js", import.meta.url), "utf8");
const grant = await readFile(new URL("../runtime/safari-normal-event-pokemon-grant.js", import.meta.url), "utf8");

assert.match(miner, /resolveMaplessV108EffectiveScalingValue/);
assert.match(miner, /resolveMaplessV108AllowedEvolutionStages/);
assert.match(miner, /resolveMaplessV108SpeciesPoolByCategoryAndStages/);
assert.match(miner, /category:\s*"FOSSIL"/);
assert.match(miner, /resolveMaplessV108ScaledEnemyLevel/);
assert.match(miner, /grantNormalEventPokemonFromSpeciesLevel/);
assert.doesNotMatch(miner, /FOSSIL_STAGE_V108/);
assert.doesNotMatch(miner, /maplessEggShop(?:BaseLevel|HatchLevel)ForDayV108/);
assert.doesNotMatch(miner, /createPokemonNewIndividualV108/);
assert.doesNotMatch(miner, /runtime\.player\.party\.push/);
assert.match(grant, /export function grantNormalEventPokemonFromSpeciesLevel/);
assert.match(grant, /createPokemonNewIndividualV108/);
assert.match(grant, /routeOne\(runtime, created\.pokemon\)/);

console.log("Safari Miner canonical fossil ownership smoke passed");
