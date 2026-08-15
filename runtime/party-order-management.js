export function movePartyPokemonToLead(party, index) {
  if (!Array.isArray(party)) throw new TypeError("party must be an array");
  const normalizedIndex = Math.trunc(Number(index));
  if (!Number.isInteger(normalizedIndex) || normalizedIndex < 0 || normalizedIndex >= party.length) {
    throw new RangeError("party index is out of range");
  }
  const pokemon = party[normalizedIndex];
  if (!pokemon) throw new Error("selected party slot is empty");
  if (normalizedIndex === 0) {
    return { changed: false, fromIndex: 0, toIndex: 0, pokemon };
  }
  party.splice(normalizedIndex, 1);
  party.unshift(pokemon);
  return { changed: true, fromIndex: normalizedIndex, toIndex: 0, pokemon };
}
