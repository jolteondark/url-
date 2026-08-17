import "./safari-general-data-demand.js";
import { SAFARI_SPECIES_MASTERS } from "./safari-playable-data.js";

export const SAFARI_WOUNDED_GENERAL_POOL_SOURCE = Object.freeze({
  canonical: 'source-v0.9.108',
  speciesCategoryCsvSha256: 'f029fd5178f2451aa9aa7be1c71a7853395ba5014f29ffbf4a11b65077f08cc6',
  validGeneralSpeciesPoolSha256: '440421e93b6f321e12b5312f6c34809042f1a1c60a13aa99964a61ecf235f11d',
  expectedGeneralSpecies: 875,
});

/** Safari adapter for private M0393. GENERAL masters are demand-installed in browsers. */
export function safariWoundedGeneralSpeciesPoolV108() {
  const ranked = Object.entries(SAFARI_SPECIES_MASTERS).map(([speciesId, master]) => {
    if (!master || master.id !== speciesId) throw new TypeError(`invalid Safari GENERAL species master: ${speciesId}`);
    const dexNumber = Number(master.dex_number);
    if (!Number.isInteger(dexNumber) || dexNumber <= 0) throw new TypeError(`canonical dex_number is required: ${speciesId}`);
    return { speciesId, dexNumber };
  });
  if (ranked.length !== SAFARI_WOUNDED_GENERAL_POOL_SOURCE.expectedGeneralSpecies) {
    throw new Error(`canonical wounded GENERAL species count mismatch: ${ranked.length}`);
  }
  const uniqueDex = new Set(ranked.map((entry) => entry.dexNumber));
  if (uniqueDex.size !== ranked.length) throw new Error('wounded GENERAL dex_number values must be unique');
  ranked.sort((a, b) => a.dexNumber - b.dexNumber);
  const pool = ranked.map((entry) => entry.speciesId);
  if (pool[0] !== 'BULBASAUR' || pool[pool.length - 1] !== 'HYDRAPPLE') {
    throw new Error(`canonical wounded GENERAL ordering mismatch: ${pool[0]}/${pool[pool.length - 1]}`);
  }
  return pool;
}
