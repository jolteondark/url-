import { resolvePokemonRuntimeMasters } from "./pokemon-runtime-masters.js";
import { POKEMON_NATURE_MASTERS_V108 } from "./pokemon-nature-masters-v108.js";
import { resolvePokemonNewCreationFormSpeciesMasterV108 } from "./pokemon-new-creation-form-v108.js";
import { SAFARI_MOVE_MASTERS, SAFARI_SPECIES_MASTERS } from "./safari-playable-data.js";

const ZERO_STATS = Object.freeze({ HP:0, ATTACK:0, DEFENSE:0, SPECIAL_ATTACK:0, SPECIAL_DEFENSE:0, SPEED:0 });

export function materializePreparedWoundedPokemon(event) {
  const data = event?.normal_data;
  const fixed = data?.pokemon_data;
  if (!data?.species || !fixed) throw new Error("prepared wounded Pokemon data is required");
  const baseMaster = SAFARI_SPECIES_MASTERS[data.species];
  if (!baseMaster) throw new RangeError(`species is outside the canonical GENERAL pool: ${data.species}`);
  const form = Number.isInteger(Number(fixed.form)) ? Math.max(0, Number(fixed.form)) : 0;
  const speciesMaster = resolvePokemonNewCreationFormSpeciesMasterV108(baseMaster, form);
  const natureId = String(fixed.nature ?? "");
  const natureMaster = POKEMON_NATURE_MASTERS_V108[natureId];
  if (!natureMaster) throw new RangeError(`unknown wounded Pokemon nature: ${natureId}`);
  const runtime = resolvePokemonRuntimeMasters({
    species: data.species,
    level: Number(data.level),
    form,
    personal_id: Number(fixed.personal_id ?? data.personal_id),
    ability_index: Number(fixed.ability_index ?? 0),
    gender: fixed.gender,
    nature_id: natureId,
    iv: structuredClone(fixed.iv ?? {}),
    ev: { ...ZERO_STATS },
    moves: [...(fixed.moves ?? [])],
    hp: 1,
    status: "NONE",
    item: null,
    mapless_bonus_stats: { ...ZERO_STATS },
  }, {
    species_master: speciesMaster,
    nature_master: natureMaster,
    move_masters: SAFARI_MOVE_MASTERS,
  });
  return { ...runtime, hp: 1, item: null, held_item: null };
}
