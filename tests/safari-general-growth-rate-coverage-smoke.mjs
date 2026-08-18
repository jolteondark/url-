import assert from "node:assert/strict";
import { projectGeneralEncounterSpeciesPools } from "../runtime/general-encounter-species-pools.js";
import {
  projectSafariGeneralGrowthRates,
  SAFARI_GENERAL_GROWTH_RATE_METADATA,
} from "../runtime/safari-general-growth-rate-facts.js";
import { POKEMON_GROWTH_RATE_IDS } from "../runtime/pokemon-growth-rate.js";

const speciesIds = [...new Set(Object.values(projectGeneralEncounterSpeciesPools())
  .flatMap((byStage) => Object.values(byStage).flat()))].sort();
const projected = projectSafariGeneralGrowthRates(speciesIds);
assert.equal(speciesIds.length, 875);
assert.equal(Object.keys(projected).length, 875);
assert.equal(SAFARI_GENERAL_GROWTH_RATE_METADATA.speciesCount, 875);
assert.equal(speciesIds.filter((id) => !POKEMON_GROWTH_RATE_IDS.includes(projected[id])).length, 0);
assert.equal(projected.BULBASAUR, "Parabolic");
assert.equal(projected.PIKACHU, "Medium");
assert.equal(projected.LARVITAR, "Slow");
assert.equal(projected.SHROOMISH, "Fluctuating");
console.log("Safari GENERAL GrowthRate 875-species coverage smoke: PASS");
