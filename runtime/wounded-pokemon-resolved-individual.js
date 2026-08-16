import {
  SAFARI_GENERAL_MOVE_MASTERS,
  SAFARI_GENERAL_SPECIES_MASTERS,
} from "./safari-general-encounter-data-loader.js";
import { createPokemonNewIndividualV108 } from "./pokemon-new-individual-v108.js";

function requireGeneralSpeciesMaster(species) {
  const id = String(species ?? "");
  if (!id) throw new TypeError("species is required");
  const master = SAFARI_GENERAL_SPECIES_MASTERS[id];
  if (!master) throw new RangeError(`species is outside the canonical GENERAL pool: ${id}`);
  return master;
}

export function createResolvedWoundedPokemonIndividualV108(input = {}) {
  const speciesMaster = requireGeneralSpeciesMaster(input.species);
  const resolved = createPokemonNewIndividualV108({
    species: speciesMaster.id,
    level: input.level,
    speciesMaster,
    moveMasters: SAFARI_GENERAL_MOVE_MASTERS,
    finalPersonalId: input.finalPersonalId,
    randomInt: input.randomInt,
    creationFormContext: input.creationFormContext,
  });
  return structuredClone(resolved.pokemon);
}
