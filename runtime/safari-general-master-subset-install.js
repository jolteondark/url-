import { SAFARI_MOVE_MASTERS, SAFARI_SPECIES_MASTERS } from "./safari-playable-data.js";

export function installSafariGeneralMasterSubset(speciesMasters = {}, moveMasters = {}) {
  if (!speciesMasters || typeof speciesMasters !== "object" || Array.isArray(speciesMasters)) {
    throw new TypeError("species master subset must be an object");
  }
  if (!moveMasters || typeof moveMasters !== "object" || Array.isArray(moveMasters)) {
    throw new TypeError("move master subset must be an object");
  }
  Object.assign(SAFARI_SPECIES_MASTERS, speciesMasters);
  Object.assign(SAFARI_MOVE_MASTERS, moveMasters);
  return Object.freeze({
    speciesCount: Object.keys(speciesMasters).length,
    moveCount: Object.keys(moveMasters).length,
  });
}
