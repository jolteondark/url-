import { projectGeneralEncounterRules } from './general-encounter-rules-master.js';

function integer(value, field) {
  const n = Number(value);
  if (!Number.isInteger(n)) throw new TypeError(`${field} must be an integer`);
  return n;
}

function clone(value) { return structuredClone(value); }

export function scaledWoundedNormalLevel(day) {
  day = integer(day, 'day');
  if (day < 1) throw new RangeError('day must be >= 1');
  const rules = projectGeneralEncounterRules().enemyScaling;
  const dayScaling = Math.floor((day - 1) / rules.dayInterval);
  const effective = Math.max(0, dayScaling + Number(rules.rankModifiers.NORMAL));
  return Math.max(rules.minLevel, Math.min(rules.maxLevel, rules.baseLevel + effective * rules.levelsPerScaling));
}

function moveId(move) { return typeof move === 'string' ? move : move?.id; }

function snapshotPokemon(pokemon) {
  if (!pokemon || typeof pokemon !== 'object' || Array.isArray(pokemon)) throw new TypeError('resolvedPokemon is required');
  const species = String(pokemon.species ?? '');
  if (!species) throw new TypeError('resolvedPokemon.species is required');
  const level = integer(pokemon.level, 'resolvedPokemon.level');
  const personalId = integer(pokemon.personal_id ?? pokemon.personalID, 'resolvedPokemon.personal_id');
  if (personalId < 0 || personalId > 0xffffffff) throw new RangeError('personal_id must be uint32');
  const abilityIndex = integer(pokemon.ability_index ?? 0, 'resolvedPokemon.ability_index');
  const gender = pokemon.gender;
  const nature = String(pokemon.nature_id ?? pokemon.nature ?? '');
  if (!nature) throw new TypeError('resolvedPokemon nature is required');
  const iv = clone(pokemon.iv ?? {});
  const moves = (pokemon.moves ?? []).map(moveId);
  if (moves.some((id) => typeof id !== 'string' || !id)) throw new TypeError('resolvedPokemon moves must have ids');
  return { species, level, personalId, abilityIndex, gender, nature, iv, moves };
}

export function prepareWoundedPokemonSnapshot(input = {}) {
  const event = clone(input.event ?? {});
  event.normal_data = { ...(event.normal_data ?? {}) };
  const data = event.normal_data;
  const day = integer(input.day, 'day');
  if (day < 1) throw new RangeError('day must be >= 1');
  const normalSeed = integer(data.normal_seed ?? input.normalSeed, 'normal_seed');
  if (normalSeed < 0 || normalSeed > 0xffffffff) throw new RangeError('normal_seed must be uint32');
  const resolved = snapshotPokemon(input.resolvedPokemon);
  const expectedLevel = scaledWoundedNormalLevel(day);
  const allowedSpecies = Array.isArray(input.validGeneralSpeciesPool) ? input.validGeneralSpeciesPool.map(String) : null;
  if (!allowedSpecies || allowedSpecies.length === 0) throw new TypeError('validGeneralSpeciesPool is required');
  if (!allowedSpecies.includes(resolved.species)) throw new RangeError('resolved Pokemon species is outside canonical General pool');
  if (resolved.level !== expectedLevel) throw new RangeError(`resolved Pokemon level must equal canonical NORMAL level ${expectedLevel}`);
  if (data.species != null && String(data.species) !== resolved.species) throw new RangeError('prepared species does not match resolved Pokemon');
  if (data.level != null && Number(data.level) !== resolved.level) throw new RangeError('prepared level does not match resolved Pokemon');
  data.normal_seed = normalSeed;
  data.species = resolved.species;
  data.level = resolved.level;
  data.personal_id = resolved.personalId;
  data.pokemon_data = {
    personal_id: resolved.personalId,
    ability_index: resolved.abilityIndex,
    gender: resolved.gender,
    nature: resolved.nature,
    iv: resolved.iv,
    moves: [...resolved.moves],
  };
  return {
    event,
    species: resolved.species,
    level: resolved.level,
    normalSeed,
    pokemonData: clone(data.pokemon_data),
    operations: [
      { op: 'validate_general_species', species: resolved.species, result: true },
      { op: 'resolve_scaled_normal_level', day, level: resolved.level },
      { op: 'snapshot_wounded_pokemon', species: resolved.species, level: resolved.level, personal_id: resolved.personalId },
    ],
  };
}

export function materializeWoundedPokemonFromSnapshot(event, pokemonFactory) {
  const data = event?.normal_data;
  if (!data?.species || !data?.pokemon_data) throw new Error('prepared wounded Pokemon data is required');
  if (typeof pokemonFactory !== 'function') throw new TypeError('pokemonFactory is required');
  const p = data.pokemon_data;
  const pokemon = pokemonFactory({
    species: data.species,
    level: data.level,
    personal_id: p.personal_id,
    ability_index: p.ability_index,
    gender: p.gender,
    nature_id: p.nature,
    iv: clone(p.iv),
    moves: [...(p.moves ?? [])],
    hp: 1,
  });
  if (!pokemon || pokemon.species !== data.species || Number(pokemon.level) !== Number(data.level)) throw new Error('pokemonFactory returned a mismatched wounded Pokemon');
  pokemon.hp = 1;
  return pokemon;
}
