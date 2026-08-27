import assert from "node:assert/strict";
import {
  resolveMaplessV108SpeciesEvolutionStage,
  resolveMaplessV108SpeciesPoolByCategoryAndStages,
} from "../runtime/mapless-v108-species-evolution.js";

assert.equal(resolveMaplessV108SpeciesEvolutionStage("OMANYTE"), "ONE_EVOLUTION_BASE");
assert.equal(resolveMaplessV108SpeciesEvolutionStage("OMASTAR"), "ONE_EVOLUTION_FINAL");
assert.equal(resolveMaplessV108SpeciesEvolutionStage("AERODACTYL"), "NO_EVOLUTION");
assert.equal(resolveMaplessV108SpeciesEvolutionStage("CRANIDOS"), "ONE_EVOLUTION_BASE");
assert.equal(resolveMaplessV108SpeciesEvolutionStage("DELTAGOODRA"), "TWO_EVOLUTION_FINAL");
assert.equal(resolveMaplessV108SpeciesEvolutionStage("NOT_A_SPECIES"), null);

assert.deepEqual(
  resolveMaplessV108SpeciesPoolByCategoryAndStages({
    category: "FOSSIL",
    allowedStages: ["NO_EVOLUTION", "ONE_EVOLUTION_BASE", "TWO_EVOLUTION_BASE"],
  }),
  [
    "AERODACTYL", "OMANYTE", "KABUTO", "LILEEP", "ANORITH", "CRANIDOS",
    "SHIELDON", "TIRTOUGA", "ARCHEN", "TYRUNT", "AMAURA", "DRACOZOLT",
    "ARCTOZOLT", "DRACOVISH", "ARCTOVISH",
  ],
);

assert.deepEqual(
  resolveMaplessV108SpeciesPoolByCategoryAndStages({
    category: "FOSSIL",
    allowedStages: ["NO_EVOLUTION", "ONE_EVOLUTION_FINAL", "TWO_EVOLUTION_FINAL"],
  }),
  [
    "AERODACTYL", "OMASTAR", "KABUTOPS", "CRADILY", "ARMALDO", "RAMPARDOS",
    "BASTIODON", "CARRACOSTA", "ARCHEOPS", "TYRANTRUM", "AURORUS", "DRACOZOLT",
    "ARCTOZOLT", "DRACOVISH", "ARCTOVISH",
  ],
);

assert.deepEqual(
  resolveMaplessV108SpeciesPoolByCategoryAndStages({ category: "FOSSIL", allowedStages: ["BOGUS"] }),
  [],
);

console.log("mapless-v108-species-evolution smoke: PASS");
