function clone(value) {
  if (value == null || typeof value !== "object") return value;
  return Array.isArray(value)
    ? value.map(clone)
    : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
}

function stateOf(input) {
  if (!input || typeof input !== "object") throw new TypeError("state is required");
  return {
    ...clone(input),
    party: Array.isArray(input.party) ? input.party.map(clone) : [],
    boxes: Array.isArray(input.boxes)
      ? input.boxes.map((box) => ({ ...clone(box), slots: Array.isArray(box?.slots) ? box.slots.map(clone) : [] }))
      : [],
  };
}

function capacity(value, fallback, field) {
  const parsed = value == null ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new TypeError(`${field} must be a non-negative integer`);
  return parsed;
}

export function pokemonEgg(pokemon) {
  return Boolean(pokemon) && Number(pokemon.steps_to_hatch ?? 0) > 0;
}

export function pokemonFainted(pokemon) {
  return Boolean(pokemon) && !pokemonEgg(pokemon) && Number(pokemon.hp ?? 0) <= 0;
}

export function pokemonAble(pokemon) {
  return Boolean(pokemon) && !pokemonEgg(pokemon) && Number(pokemon.hp ?? 0) > 0;
}

export function activeParty(state) {
  return stateOf(state).party.filter((pokemon) => pokemonAble(pokemon));
}

export function ablePokemonCount(state) {
  return activeParty(state).length;
}

export function allFainted(state) {
  return ablePokemonCount(state) === 0;
}

export function removePokemonAtIndex(state, index) {
  const value = stateOf(state);
  if (!Number.isInteger(index) || index < 0 || index >= value.party.length) {
    return { result: false, state: value, operations: [{ op: "remove_rejected", reason: "index" }] };
  }
  const hasOtherAble = value.party.some((pokemon, i) => i !== index && pokemonAble(pokemon));
  if (!hasOtherAble) {
    return { result: false, state: value, operations: [{ op: "remove_rejected", reason: "last_able" }] };
  }
  value.party.splice(index, 1);
  return { result: true, state: value, operations: [{ op: "remove_party", index }] };
}

function maxPokemon(value, box, maxPartySize, defaultBoxCapacity) {
  if (box < 0) return maxPartySize;
  if (box >= value.boxes.length) return 0;
  return capacity(value.boxes[box].capacity, defaultBoxCapacity, "box capacity");
}

function getPokemon(value, box, index) {
  return box < 0 ? value.party[index] : value.boxes[box]?.slots[index];
}

function setPokemon(value, box, index, pokemon) {
  if (box < 0) {
    value.party[index] = clone(pokemon);
    return;
  }
  const slots = value.boxes[box].slots.slice();
  while (slots.length <= index) slots.push(null);
  slots[index] = clone(pokemon);
  value.boxes[box] = { ...value.boxes[box], slots };
}

function firstFree(value, box, maxPartySize, defaultBoxCapacity) {
  if (box < 0) return value.party.length >= maxPartySize ? -1 : value.party.length;
  const maximum = maxPokemon(value, box, maxPartySize, defaultBoxCapacity);
  for (let i = 0; i < maximum; i += 1) if (getPokemon(value, box, i) == null) return i;
  return -1;
}

export function deleteStoredPokemon(state, box, index) {
  const value = stateOf(state);
  if (getPokemon(value, box, index) != null) {
    setPokemon(value, box, index, null);
    if (box < 0) value.party = value.party.filter((pokemon) => pokemon != null);
  }
  return { state: value, operations: [{ op: "delete", box, index }] };
}

export function copyStoredPokemon(state, {
  boxDst,
  indexDst = -1,
  boxSrc,
  indexSrc,
  maxPartySize = 6,
  defaultBoxCapacity = 30,
} = {}) {
  const value = stateOf(state);
  const partyLimit = capacity(maxPartySize, 6, "maxPartySize");
  const boxLimit = capacity(defaultBoxCapacity, 30, "defaultBoxCapacity");
  let destinationIndex = indexDst;
  if (destinationIndex < 0 && boxDst < value.boxes.length) {
    destinationIndex = firstFree(value, boxDst, partyLimit, boxLimit);
    if (destinationIndex < 0) {
      return { result: false, state: value, operations: [{ op: "copy_rejected", reason: "no_destination" }] };
    }
  }
  const pokemon = getPokemon(value, boxSrc, indexSrc);
  if (pokemon == null) throw new TypeError("Trying to copy nil to storage");
  if (boxDst < 0) {
    if (value.party.length >= partyLimit) {
      return { result: false, state: value, operations: [{ op: "copy_rejected", reason: "party_full" }] };
    }
    value.party.push(clone(pokemon));
    value.party = value.party.filter((entry) => entry != null);
  } else {
    setPokemon(value, boxDst, destinationIndex, pokemon);
  }
  return {
    result: true,
    state: value,
    destination: { box: boxDst, index: destinationIndex },
    operations: [{ op: "copy", boxDst, indexDst: destinationIndex, boxSrc, indexSrc }],
  };
}

export function moveStoredPokemon(state, options = {}) {
  const copied = copyStoredPokemon(state, options);
  if (!copied.result) return copied;
  const deleted = deleteStoredPokemon(copied.state, options.boxSrc, options.indexSrc);
  return {
    result: true,
    state: deleted.state,
    destination: copied.destination,
    operations: [...copied.operations, ...deleted.operations],
  };
}
