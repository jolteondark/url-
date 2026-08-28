import { addPokemonRuntimeMaplessBonusStat } from "./pokemon-runtime.js";
import { SAFARI_NATURE_MASTERS, SAFARI_SPECIES_MASTERS } from "./safari-playable-data.js";

export function applySafariPartyMaplessBonus(runtime, partyIndex, stat, amount = 1) {
  const index = Number(partyIndex);
  if (!Number.isInteger(index) || index < 0) {
    return { success:false, reason:"invalid_party_index", operations:[] };
  }
  const pokemon = runtime?.player?.party?.[index];
  if (!pokemon) return { success:false, reason:"missing_pokemon", operations:[] };
  const speciesMaster = SAFARI_SPECIES_MASTERS[pokemon.species];
  if (!speciesMaster) return { success:false, reason:"unknown_species", operations:[] };
  const natureId = pokemon.nature_for_stats_id ?? pokemon.nature_id ?? null;
  const natureMaster = natureId ? SAFARI_NATURE_MASTERS[natureId] : null;
  const before = structuredClone(pokemon.mapless_bonus_stats ?? {});
  const next = addPokemonRuntimeMaplessBonusStat(pokemon, stat, amount, {
    base_stats:speciesMaster.base_stats,
    nature_stat_changes:natureMaster?.stat_changes ?? [],
  });
  runtime.player.party[index] = next;
  return {
    success:true,
    pokemon:next,
    operations:[{
      op:"runtime_add_mapless_bonus_stat",
      party_index:index,
      species:next.species,
      stat,
      amount,
      before,
      after:structuredClone(next.mapless_bonus_stats ?? {}),
    }],
  };
}
