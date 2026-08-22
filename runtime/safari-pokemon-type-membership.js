import { SAFARI_SPECIES_MASTERS } from "./safari-playable-data.js";

function canonicalType(value) {
  return String(value ?? "").trim().toUpperCase();
}

export function safariPokemonTypes(pokemon) {
  if (!pokemon || typeof pokemon !== "object" || Array.isArray(pokemon)) return [];
  if (Array.isArray(pokemon.types)) return pokemon.types.map(canonicalType).filter(Boolean);
  if (Array.isArray(pokemon.type_ids)) return pokemon.type_ids.map(canonicalType).filter(Boolean);
  const species = String(pokemon.species ?? "").trim().toUpperCase();
  const masterTypes = SAFARI_SPECIES_MASTERS[species]?.types;
  return Array.isArray(masterTypes) ? masterTypes.map(canonicalType).filter(Boolean) : [];
}

export function hasSafariUsablePartyType(runtime, ...typeIds) {
  const wanted = new Set(typeIds.map(canonicalType).filter(Boolean));
  return (runtime?.player?.party ?? []).some((pokemon) => {
    if (!pokemon || Number(pokemon.hp ?? 0) <= 0 || pokemon.egg === true) return false;
    return safariPokemonTypes(pokemon).some((type) => wanted.has(type));
  });
}
